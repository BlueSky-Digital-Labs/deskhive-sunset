"""
Tests for the My Bookings list API and booking cancellation rules.
"""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from bookings.services import create_desk_booking, create_room_booking
from spaces.models import Desk, Floor, Room

User = get_user_model()

REGISTER_URL = '/api/v1/auth/register/'
LOGIN_URL = '/api/v1/auth/login/'
MY_BOOKINGS_URL = '/api/v1/my/bookings'
BOOKINGS_URL = '/api/v1/bookings/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='my-bookings@example.com',
        password='securepass123',
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email='my-bookings-other@example.com',
        password='securepass123',
    )


@pytest.fixture
def auth_client():
    client = APIClient()
    user_data = {
        'email': 'my-bookings@example.com',
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
        'email': 'my-bookings-other@example.com',
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
        name='Level 2',
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


def _fixed_now():
    return datetime(2026, 7, 12, 12, 0, tzinfo=timezone.utc)


@pytest.mark.django_db
class TestMyBookingsListAPI:
    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.localdate', return_value=_fixed_now().date())
    def test_list_only_authenticated_user_bookings(
        self, _mock_localdate, _mock_serializer_now, _mock_service_now, user, other_user, desk, room
    ):
        today = _fixed_now().date()
        create_desk_booking(user, desk.id, today + timedelta(days=1))
        create_desk_booking(other_user, desk.id, today + timedelta(days=2))

        client = APIClient()
        client.post(
            REGISTER_URL,
            {'email': user.email, 'password': 'securepass123'},
            format='json',
        )
        login_response = client.post(
            LOGIN_URL,
            {'email': user.email, 'password': 'securepass123'},
            format='json',
        )
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {login_response.data["access"]}')

        response = client.get(MY_BOOKINGS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['desk_id'] == desk.id

    def test_unauthenticated_request_rejected(self, api_client):
        response = api_client.get(MY_BOOKINGS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.localdate', return_value=_fixed_now().date())
    def test_upcoming_bucket_includes_today_desk_and_future_room(
        self, _mock_localdate, _mock_serializer_now, _mock_service_now, user, desk, room
    ):
        today = _fixed_now().date()
        now = _fixed_now()

        desk_today = create_desk_booking(user, desk.id, today)
        desk_future = create_desk_booking(
            user,
            desk.id,
            today + timedelta(days=6),
        )

        room_upcoming = create_room_booking(
            user,
            room.id,
            now + timedelta(hours=1),
            now + timedelta(hours=2),
        )
        create_room_booking(
            user,
            room.id,
            now - timedelta(hours=3),
            now - timedelta(hours=2),
        )

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(MY_BOOKINGS_URL, {'bucket': 'upcoming'})

        assert response.status_code == status.HTTP_200_OK
        result_ids = {item['id'] for item in response.data['results']}
        assert str(desk_today.id) in result_ids
        assert str(desk_future.id) in result_ids
        assert str(room_upcoming.id) in result_ids
        assert response.data['count'] == 3

    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.localdate', return_value=_fixed_now().date())
    def test_past_bucket_boundary_cases(
        self, _mock_localdate, _mock_serializer_now, _mock_service_now, user, desk, room
    ):
        today = _fixed_now().date()
        now = _fixed_now()

        past_desk = Booking.objects.create(
            user=user,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id=desk.id,
            date=today - timedelta(days=1),
            status=Booking.STATUS_ACTIVE,
        )
        ended_room = create_room_booking(
            user,
            room.id,
            now - timedelta(hours=2),
            now - timedelta(minutes=1),
        )
        cancelled_future = create_desk_booking(user, desk.id, today + timedelta(days=3))
        cancelled_future.status = Booking.STATUS_CANCELLED
        cancelled_future.save(update_fields=['status'])

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(MY_BOOKINGS_URL, {'bucket': 'past'})

        assert response.status_code == status.HTTP_200_OK
        result_ids = {item['id'] for item in response.data['results']}
        assert str(past_desk.id) in result_ids
        assert str(ended_room.id) in result_ids
        assert str(cancelled_future.id) in result_ids

    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.localdate', return_value=_fixed_now().date())
    def test_room_still_upcoming_when_end_at_is_now(
        self, _mock_localdate, _mock_serializer_now, _mock_service_now, user, room
    ):
        now = _fixed_now()
        booking = create_room_booking(
            user,
            room.id,
            now - timedelta(minutes=30),
            now,
        )

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(MY_BOOKINGS_URL, {'bucket': 'upcoming'})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['id'] == str(booking.id)

    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.localdate', return_value=_fixed_now().date())
    def test_resource_type_filter(
        self, _mock_localdate, _mock_serializer_now, _mock_service_now, user, desk, room
    ):
        today = _fixed_now().date()
        now = _fixed_now()
        create_desk_booking(user, desk.id, today + timedelta(days=1))
        create_room_booking(
            user,
            room.id,
            now + timedelta(hours=1),
            now + timedelta(hours=2),
        )

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(MY_BOOKINGS_URL, {'resource_type': 'desk'})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['resource_type'] == 'desk'

    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.localdate', return_value=_fixed_now().date())
    def test_list_payload_excludes_checked_in_at_and_includes_computed_fields(
        self, _mock_localdate, _mock_serializer_now, _mock_service_now, user, desk
    ):
        today = _fixed_now().date()
        create_desk_booking(user, desk.id, today + timedelta(days=1))

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(MY_BOOKINGS_URL)

        assert response.status_code == status.HTTP_200_OK
        item = response.data['results'][0]
        assert 'checked_in_at' not in item
        assert 'resource_label' in item
        assert item['resource_label'] is None
        assert item['is_upcoming'] is True

    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.now', return_value=_fixed_now())
    @patch('bookings.serializers.timezone.localdate', return_value=_fixed_now().date())
    def test_pagination_page_size_and_order(
        self, _mock_localdate, _mock_serializer_now, _mock_service_now, user, desk
    ):
        today = _fixed_now().date()
        for offset in range(21):
            Booking.objects.create(
                user=user,
                resource_type=Booking.RESOURCE_TYPE_DESK,
                resource_id=desk.id,
                date=today + timedelta(days=offset + 1),
                status=Booking.STATUS_ACTIVE,
            )

        client = APIClient()
        client.force_authenticate(user=user)
        page_one = client.get(MY_BOOKINGS_URL)
        page_two = client.get(MY_BOOKINGS_URL, {'page': 2})

        assert page_one.status_code == status.HTTP_200_OK
        assert page_two.status_code == status.HTTP_200_OK
        assert page_one.data['count'] == 21
        assert len(page_one.data['results']) == 20
        assert len(page_two.data['results']) == 1

        page_one_dates = [item['date'] for item in page_one.data['results']]
        assert page_one_dates == sorted(page_one_dates)


@pytest.mark.django_db
class TestBookingCancelAction:
    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.services.timezone.localdate', return_value=_fixed_now().date())
    def test_cancel_upcoming_owned_booking_returns_200(
        self, _mock_localdate, _mock_now, auth_client, desk
    ):
        user = User.objects.get(email='my-bookings@example.com')
        booking = create_desk_booking(
            user,
            desk.id,
            _fixed_now().date() + timedelta(days=1),
        )

        response = auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == Booking.STATUS_CANCELLED
        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_CANCELLED

    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    def test_cancel_other_users_booking_returns_403(
        self, _mock_now, other_auth_client, user, desk
    ):
        booking = create_desk_booking(
            user,
            desk.id,
            _fixed_now().date() + timedelta(days=1),
        )

        response = other_auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.services.timezone.localdate', return_value=_fixed_now().date())
    def test_cancel_past_booking_returns_400(
        self, _mock_localdate, _mock_now, auth_client, desk
    ):
        user = User.objects.get(email='my-bookings@example.com')
        booking = Booking.objects.create(
            user=user,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id=desk.id,
            date=_fixed_now().date() - timedelta(days=1),
            status=Booking.STATUS_ACTIVE,
        )

        response = auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'upcoming' in response.data['detail']

    @patch('bookings.services.timezone.now', return_value=_fixed_now())
    @patch('bookings.services.timezone.localdate', return_value=_fixed_now().date())
    def test_cancel_checked_in_booking_returns_400(
        self, _mock_localdate, _mock_now, auth_client, desk
    ):
        user = User.objects.get(email='my-bookings@example.com')
        booking = create_desk_booking(
            user,
            desk.id,
            _fixed_now().date() + timedelta(days=1),
        )
        booking.status = Booking.STATUS_CHECKED_IN
        booking.save(update_fields=['status'])

        response = auth_client.post(f'{BOOKINGS_URL}{booking.id}/cancel/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
