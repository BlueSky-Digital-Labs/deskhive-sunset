"""
Tests for room booking overlap detection, cancellation, and concurrency.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.db.utils import OperationalError
from rest_framework import status
from rest_framework.test import APIClient

from bookings.exceptions import RoomAlreadyBooked
from bookings.models import Booking
from bookings.services import cancel_booking, create_room_booking
from spaces.models import Floor, Room

User = get_user_model()

REGISTER_URL = '/api/v1/auth/register/'
LOGIN_URL = '/api/v1/auth/login/'
BOOKINGS_URL = '/api/v1/bookings/'
ROOMS_AVAILABILITY_URL = '/api/v1/availability/rooms/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='room-booker@example.com',
        password='securepass123',
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email='room-other@example.com',
        password='securepass123',
    )


@pytest.fixture
def auth_client():
    client = APIClient()
    user_data = {
        'email': 'room-booker@example.com',
        'password': 'securepass123',
    }
    client.post(REGISTER_URL, user_data, format='json')
    login_response = client.post(
        LOGIN_URL,
        {'email': user_data['email'], 'password': user_data['password']},
        format='json',
    )
    access_token = login_response.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    return client


@pytest.fixture
def other_auth_client():
    client = APIClient()
    user_data = {
        'email': 'room-other@example.com',
        'password': 'securepass123',
    }
    client.post(REGISTER_URL, user_data, format='json')
    login_response = client.post(
        LOGIN_URL,
        {'email': user_data['email'], 'password': user_data['password']},
        format='json',
    )
    access_token = login_response.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    return client


@pytest.fixture
def floor(db):
    return Floor.objects.create(
        name='Meeting Level',
        building='HQ',
        level='4',
        is_active=True,
    )


@pytest.fixture
def room(floor):
    return Room.objects.create(
        floor=floor,
        name='Room B1',
        capacity=8,
        is_active=True,
    )


@pytest.fixture
def other_room(floor):
    return Room.objects.create(
        floor=floor,
        name='Room B2',
        capacity=6,
        is_active=True,
    )


@pytest.fixture
def booking_window():
    start = datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=1)
    return start, end


@pytest.mark.django_db
class TestRoomBookingService:
    def test_create_room_booking_success(self, user, room, booking_window):
        start, end = booking_window
        booking = create_room_booking(user, room.id, start, end)

        assert booking.id is not None
        assert booking.user == user
        assert booking.resource_type == Booking.RESOURCE_TYPE_ROOM
        assert booking.resource_id == room.id
        assert booking.start_at == start
        assert booking.end_at == end
        assert booking.date == start.date()
        assert booking.status == Booking.STATUS_ACTIVE

    def test_overlapping_room_booking_rejected(
        self, user, other_user, room, booking_window
    ):
        start, end = booking_window
        create_room_booking(user, room.id, start, end)

        overlap_start = start + timedelta(minutes=30)
        overlap_end = overlap_start + timedelta(hours=1)

        with pytest.raises(RoomAlreadyBooked):
            create_room_booking(other_user, room.id, overlap_start, overlap_end)

    def test_adjacent_room_bookings_allowed(self, user, other_user, room, booking_window):
        start, end = booking_window
        create_room_booking(user, room.id, start, end)

        adjacent_start = end
        adjacent_end = adjacent_start + timedelta(hours=1)
        second_booking = create_room_booking(
            other_user, room.id, adjacent_start, adjacent_end
        )

        assert second_booking.status == Booking.STATUS_ACTIVE

    def test_cancelled_room_booking_does_not_block_overlap(
        self, user, other_user, room, booking_window
    ):
        start, end = booking_window
        booking = create_room_booking(user, room.id, start, end)
        cancel_booking(user, booking)

        second_booking = create_room_booking(other_user, room.id, start, end)
        assert second_booking.status == Booking.STATUS_ACTIVE

    def test_cancel_booking_requires_owner(self, user, other_user, room, booking_window):
        start, end = booking_window
        booking = create_room_booking(user, room.id, start, end)

        with pytest.raises(Booking.DoesNotExist):
            cancel_booking(other_user, booking)

    def test_concurrent_room_booking_lock_contention(
        self, user, room, booking_window
    ):
        start, end = booking_window
        mock_queryset = MagicMock()
        mock_queryset.filter.return_value = mock_queryset
        mock_queryset.get.side_effect = OperationalError('could not obtain lock')

        with patch(
            'bookings.services.Room.objects.select_for_update',
            return_value=mock_queryset,
        ):
            with pytest.raises(RoomAlreadyBooked, match='currently being booked'):
                create_room_booking(user, room.id, start, end)


@pytest.mark.django_db
class TestRoomBookingAPI:
    def test_create_room_booking_success(self, auth_client, room, booking_window):
        start, end = booking_window
        payload = {
            'room_id': room.id,
            'start_at': start.isoformat().replace('+00:00', 'Z'),
            'end_at': end.isoformat().replace('+00:00', 'Z'),
        }
        response = auth_client.post(BOOKINGS_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['room_id'] == room.id
        assert response.data['resource_type'] == Booking.RESOURCE_TYPE_ROOM
        assert response.data['status'] == Booking.STATUS_ACTIVE

    def test_create_room_booking_unauthenticated(
        self, api_client, room, booking_window
    ):
        start, end = booking_window
        payload = {
            'room_id': room.id,
            'start_at': start.isoformat().replace('+00:00', 'Z'),
            'end_at': end.isoformat().replace('+00:00', 'Z'),
        }
        response = api_client.post(BOOKINGS_URL, payload, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_room_booking_invalid_room(self, auth_client, booking_window):
        start, end = booking_window
        payload = {
            'room_id': 99999,
            'start_at': start.isoformat().replace('+00:00', 'Z'),
            'end_at': end.isoformat().replace('+00:00', 'Z'),
        }
        response = auth_client.post(BOOKINGS_URL, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_room_overlap_conflict_via_api(
        self, auth_client, other_auth_client, room, booking_window
    ):
        start, end = booking_window
        payload = {
            'room_id': room.id,
            'start_at': start.isoformat().replace('+00:00', 'Z'),
            'end_at': end.isoformat().replace('+00:00', 'Z'),
        }
        auth_client.post(BOOKINGS_URL, payload, format='json')

        overlap_payload = {
            'room_id': room.id,
            'start_at': (start + timedelta(minutes=30)).isoformat().replace(
                '+00:00', 'Z'
            ),
            'end_at': (end + timedelta(minutes=30)).isoformat().replace('+00:00', 'Z'),
        }
        response = other_auth_client.post(
            BOOKINGS_URL, overlap_payload, format='json'
        )

        assert response.status_code == status.HTTP_409_CONFLICT
        assert 'already booked' in response.data['detail']

    def test_cancel_room_booking(self, auth_client, room, booking_window):
        start, end = booking_window
        payload = {
            'room_id': room.id,
            'start_at': start.isoformat().replace('+00:00', 'Z'),
            'end_at': end.isoformat().replace('+00:00', 'Z'),
        }
        create_response = auth_client.post(BOOKINGS_URL, payload, format='json')
        booking_id = create_response.data['id']

        response = auth_client.delete(f'{BOOKINGS_URL}{booking_id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        booking = Booking.objects.get(pk=booking_id)
        assert booking.status == Booking.STATUS_CANCELLED

    def test_cancelled_room_booking_frees_availability(
        self, auth_client, room, booking_window
    ):
        start, end = booking_window
        payload = {
            'room_id': room.id,
            'start_at': start.isoformat().replace('+00:00', 'Z'),
            'end_at': end.isoformat().replace('+00:00', 'Z'),
        }
        create_response = auth_client.post(BOOKINGS_URL, payload, format='json')
        booking_id = create_response.data['id']

        occupied = auth_client.get(
            ROOMS_AVAILABILITY_URL,
            {
                'start': start.isoformat().replace('+00:00', 'Z'),
                'end': end.isoformat().replace('+00:00', 'Z'),
            },
        )
        assert occupied.data[0]['available'] is False

        auth_client.delete(f'{BOOKINGS_URL}{booking_id}/')

        available = auth_client.get(
            ROOMS_AVAILABILITY_URL,
            {
                'start': start.isoformat().replace('+00:00', 'Z'),
                'end': end.isoformat().replace('+00:00', 'Z'),
            },
        )
        assert available.data[0]['available'] is True

    def test_non_overlapping_rooms_do_not_conflict(
        self, auth_client, room, other_room, booking_window
    ):
        start, end = booking_window
        first_payload = {
            'room_id': room.id,
            'start_at': start.isoformat().replace('+00:00', 'Z'),
            'end_at': end.isoformat().replace('+00:00', 'Z'),
        }
        auth_client.post(BOOKINGS_URL, first_payload, format='json')

        second_payload = {
            'room_id': other_room.id,
            'start_at': start.isoformat().replace('+00:00', 'Z'),
            'end_at': end.isoformat().replace('+00:00', 'Z'),
        }
        response = auth_client.post(BOOKINGS_URL, second_payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED

    @patch('bookings.views.create_room_booking')
    def test_concurrent_room_booking_attempts_via_api(
        self, mock_create_room_booking, auth_client, room, booking_window
    ):
        mock_create_room_booking.side_effect = RoomAlreadyBooked(
            'Room is currently being booked by another request.'
        )
        start, end = booking_window
        payload = {
            'room_id': room.id,
            'start_at': start.isoformat().replace('+00:00', 'Z'),
            'end_at': end.isoformat().replace('+00:00', 'Z'),
        }
        response = auth_client.post(BOOKINGS_URL, payload, format='json')

        assert response.status_code == status.HTTP_409_CONFLICT
        assert 'currently being booked' in response.data['detail']

    def test_invalid_datetime_range_rejected(self, auth_client, room, booking_window):
        start, end = booking_window
        payload = {
            'room_id': room.id,
            'start_at': end.isoformat().replace('+00:00', 'Z'),
            'end_at': start.isoformat().replace('+00:00', 'Z'),
        }
        response = auth_client.post(BOOKINGS_URL, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
