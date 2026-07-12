"""
Tests for the unified my-bookings list endpoint and cancel action validation.
"""

from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from bookings.services import create_desk_booking, create_room_booking
from spaces.models import Desk, Floor, Room

User = get_user_model()

LOGIN_URL = '/api/v1/auth/login/'
MY_BOOKINGS_URL = '/api/v1/my/bookings'
BOOKINGS_URL = '/api/v1/bookings/'

FIXED_NOW = datetime(2026, 7, 12, 12, 0, tzinfo=dt_timezone.utc)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user(db):
    return User.objects.create_user(
        email='my-booker@example.com',
        password='securepass123',
    )


@pytest.fixture
def other_auth_user(db):
    return User.objects.create_user(
        email='my-other@example.com',
        password='securepass123',
    )


@pytest.fixture
def auth_client(auth_user):
    client = APIClient()
    login_response = client.post(
        LOGIN_URL,
        {'email': auth_user.email, 'password': 'securepass123'},
        format='json',
    )
    access_token = login_response.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    return client


@pytest.fixture
def other_auth_client(other_auth_user):
    client = APIClient()
    login_response = client.post(
        LOGIN_URL,
        {'email': other_auth_user.email, 'password': 'securepass123'},
        format='json',
    )
    access_token = login_response.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    return client


@pytest.fixture
def floor(db):
    return Floor.objects.create(
        name='My Bookings Floor',
        building='HQ',
        level='2',
        is_active=True,
    )


@pytest.fixture
def desk(floor):
    return Desk.objects.create(floor=floor, name='Desk M1', is_active=True)


@pytest.fixture
def room(floor):
    return Room.objects.create(
        floor=floor,
        name='Room M1',
        capacity=6,
        is_active=True,
    )


@pytest.fixture
def other_room(floor):
    return Room.objects.create(
        floor=floor,
        name='Room M2',
        capacity=4,
        is_active=True,
    )


@pytest.fixture
def frozen_time():
    with patch('bookings.serializers.timezone.now', return_value=FIXED_NOW), patch(
        'bookings.views_my.timezone.now', return_value=FIXED_NOW
    ), patch('bookings.views.timezone.now', return_value=FIXED_NOW), patch(
        'django.utils.timezone.now', return_value=FIXED_NOW
    ), patch(
        'django.utils.timezone.localdate',
        return_value=FIXED_NOW.date(),
    ):
        yield FIXED_NOW


@pytest.mark.django_db
class TestMyBookingsListView:
    def test_list_requires_authentication(self, api_client):
        response = api_client.get(MY_BOOKINGS_URL)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_returns_only_authenticated_user_bookings(
        self,
        auth_client,
        other_auth_client,
        auth_user,
        other_auth_user,
        desk,
        room,
        frozen_time,
    ):
        create_desk_booking(auth_user, desk.id, FIXED_NOW.date())
        create_desk_booking(
            other_auth_user,
            desk.id,
            FIXED_NOW.date() + timedelta(days=1),
        )

        room_start = FIXED_NOW + timedelta(days=1)
        create_room_booking(
            auth_user,
            room.id,
            room_start,
            room_start + timedelta(hours=1),
        )
        create_room_booking(
            other_auth_user,
            room.id,
            room_start + timedelta(hours=2),
            room_start + timedelta(hours=3),
        )

        response = auth_client.get(MY_BOOKINGS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        assert all(item['user_id'] == auth_user.id for item in response.data['results'])

    def test_upcoming_bucket_includes_future_desk_and_active_room(
        self, auth_client, auth_user, desk, room, frozen_time
    ):
        past_desk_date = FIXED_NOW.date() - timedelta(days=1)
        today_desk_date = FIXED_NOW.date()
        future_desk_date = FIXED_NOW.date() + timedelta(days=1)

        past_desk = create_desk_booking(auth_user, desk.id, past_desk_date)
        past_desk.status = Booking.STATUS_CANCELLED
        past_desk.save(update_fields=['status'])

        today_desk = create_desk_booking(auth_user, desk.id, today_desk_date)
        future_desk = create_desk_booking(
            auth_user,
            desk.id,
            future_desk_date,
        )

        past_room_start = FIXED_NOW - timedelta(hours=2)
        past_room = create_room_booking(
            auth_user,
            room.id,
            past_room_start,
            past_room_start + timedelta(hours=1),
        )
        future_room_start = FIXED_NOW + timedelta(hours=2)
        future_room = create_room_booking(
            auth_user,
            room.id,
            future_room_start,
            future_room_start + timedelta(hours=1),
        )

        response = auth_client.get(MY_BOOKINGS_URL, {'bucket': 'upcoming'})

        assert response.status_code == status.HTTP_200_OK
        returned_ids = {item['id'] for item in response.data['results']}
        assert str(today_desk.id) in returned_ids
        assert str(future_desk.id) in returned_ids
        assert str(future_room.id) in returned_ids
        assert str(past_room.id) not in returned_ids

    def test_past_bucket_boundary_conditions(
        self, auth_client, auth_user, desk, room, other_room, frozen_time
    ):
        past_desk = create_desk_booking(
            auth_user,
            desk.id,
            FIXED_NOW.date() - timedelta(days=1),
        )
        today_desk = create_desk_booking(auth_user, desk.id, FIXED_NOW.date())

        ended_room_start = FIXED_NOW - timedelta(hours=2)
        ended_room = create_room_booking(
            auth_user,
            room.id,
            ended_room_start,
            FIXED_NOW - timedelta(minutes=1),
        )
        active_room_start = FIXED_NOW - timedelta(minutes=30)
        active_room = create_room_booking(
            auth_user,
            other_room.id,
            active_room_start,
            FIXED_NOW + timedelta(hours=1),
        )

        response = auth_client.get(MY_BOOKINGS_URL, {'bucket': 'past'})

        assert response.status_code == status.HTTP_200_OK
        returned_ids = {item['id'] for item in response.data['results']}
        assert str(past_desk.id) in returned_ids
        assert str(ended_room.id) in returned_ids
        assert str(today_desk.id) not in returned_ids
        assert str(active_room.id) not in returned_ids

    def test_resource_type_filter(self, auth_client, auth_user, desk, room, frozen_time):
        desk_booking = create_desk_booking(
            auth_user,
            desk.id,
            FIXED_NOW.date() + timedelta(days=1),
        )
        room_start = FIXED_NOW + timedelta(days=1)
        room_booking = create_room_booking(
            auth_user,
            room.id,
            room_start,
            room_start + timedelta(hours=1),
        )

        desk_response = auth_client.get(
            MY_BOOKINGS_URL,
            {'resource_type': Booking.RESOURCE_TYPE_DESK},
        )
        room_response = auth_client.get(
            MY_BOOKINGS_URL,
            {'resource_type': Booking.RESOURCE_TYPE_ROOM},
        )

        desk_ids = {item['id'] for item in desk_response.data['results']}
        room_ids = {item['id'] for item in room_response.data['results']}

        assert str(desk_booking.id) in desk_ids
        assert str(room_booking.id) not in desk_ids
        assert str(room_booking.id) in room_ids
        assert str(desk_booking.id) not in room_ids

    def test_invalid_bucket_returns_bad_request(self, auth_client, frozen_time):
        response = auth_client.get(MY_BOOKINGS_URL, {'bucket': 'invalid'})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'bucket must be either' in response.data['detail']

    def test_serializer_fields_include_resource_label_and_is_upcoming(
        self, auth_client, auth_user, desk, frozen_time
    ):
        future_desk = create_desk_booking(
            auth_user,
            desk.id,
            FIXED_NOW.date() + timedelta(days=1),
        )
        today_desk = create_desk_booking(
            auth_user,
            desk.id,
            FIXED_NOW.date(),
        )

        response = auth_client.get(MY_BOOKINGS_URL)

        assert response.status_code == status.HTTP_200_OK
        by_id = {item['id']: item for item in response.data['results']}

        assert 'resource_label' in by_id[str(future_desk.id)]
        assert by_id[str(future_desk.id)]['resource_label'] is None
        assert by_id[str(future_desk.id)]['is_upcoming'] is True
        assert by_id[str(today_desk.id)]['is_upcoming'] is False
        assert 'checked_in_at' not in by_id[str(future_desk.id)]

    def test_upcoming_ordering_is_chronological(
        self, auth_client, auth_user, desk, room, frozen_time
    ):
        later_desk = create_desk_booking(
            auth_user,
            desk.id,
            FIXED_NOW.date() + timedelta(days=5),
        )
        sooner_desk = create_desk_booking(
            auth_user,
            desk.id,
            FIXED_NOW.date() + timedelta(days=1),
        )
        room_start = FIXED_NOW + timedelta(days=2)
        room_booking = create_room_booking(
            auth_user,
            room.id,
            room_start,
            room_start + timedelta(hours=1),
        )

        response = auth_client.get(MY_BOOKINGS_URL, {'bucket': 'upcoming'})

        assert response.status_code == status.HTTP_200_OK
        returned_ids = [item['id'] for item in response.data['results']]
        assert returned_ids.index(str(sooner_desk.id)) < returned_ids.index(
            str(room_booking.id)
        )
        assert returned_ids.index(str(room_booking.id)) < returned_ids.index(
            str(later_desk.id)
        )

    def test_pagination_page_size_and_pages(
        self, auth_client, auth_user, desk, frozen_time
    ):
        for offset in range(21):
            create_desk_booking(
                auth_user,
                desk.id,
                FIXED_NOW.date() + timedelta(days=offset + 1),
            )

        first_page = auth_client.get(MY_BOOKINGS_URL, {'bucket': 'upcoming'})
        second_page = auth_client.get(
            MY_BOOKINGS_URL,
            {'bucket': 'upcoming', 'page': 2},
        )

        assert first_page.status_code == status.HTTP_200_OK
        assert len(first_page.data['results']) == 20
        assert first_page.data['count'] == 21
        assert first_page.data['next'] is not None
        assert second_page.status_code == status.HTTP_200_OK
        assert len(second_page.data['results']) == 1


@pytest.mark.django_db
class TestBookingCancelAction:
    def test_cancel_future_desk_booking_success(
        self, auth_client, auth_user, desk, frozen_time
    ):
        booking = create_desk_booking(
            auth_user,
            desk.id,
            FIXED_NOW.date() + timedelta(days=1),
        )

        response = auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_CANCELLED

    def test_cancel_future_room_booking_success(
        self, auth_client, auth_user, room, frozen_time
    ):
        room_start = FIXED_NOW + timedelta(hours=2)
        booking = create_room_booking(
            auth_user,
            room.id,
            room_start,
            room_start + timedelta(hours=1),
        )

        response = auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_CANCELLED

    def test_cancel_past_desk_booking_rejected(
        self, auth_client, auth_user, desk, frozen_time
    ):
        booking = create_desk_booking(
            auth_user,
            desk.id,
            FIXED_NOW.date() - timedelta(days=1),
        )

        response = auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Past desk bookings cannot be cancelled' in response.data['detail']
        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_ACTIVE

    def test_cancel_started_room_booking_rejected(
        self, auth_client, auth_user, room, frozen_time
    ):
        room_start = FIXED_NOW - timedelta(minutes=30)
        booking = create_room_booking(
            auth_user,
            room.id,
            room_start,
            FIXED_NOW + timedelta(hours=1),
        )

        response = auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already started' in response.data['detail']
        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_ACTIVE

    def test_cancel_other_users_booking_returns_not_found(
        self, auth_client, other_auth_user, desk, frozen_time
    ):
        booking = create_desk_booking(
            other_auth_user,
            desk.id,
            FIXED_NOW.date() + timedelta(days=1),
        )

        response = auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_404_NOT_FOUND
        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_ACTIVE

    def test_cancel_already_cancelled_booking_is_idempotent(
        self, auth_client, auth_user, desk, frozen_time
    ):
        booking = create_desk_booking(
            auth_user,
            desk.id,
            FIXED_NOW.date() + timedelta(days=1),
        )
        booking.status = Booking.STATUS_CANCELLED
        booking.save(update_fields=['status'])

        response = auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
