"""
Tests for booking check-in endpoint and service logic.
"""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from bookings.exceptions import CheckInNotAllowed
from bookings.models import Booking
from bookings.services import (
    check_in_booking,
    create_desk_booking,
    create_room_booking,
)
from spaces.models import Desk, Floor, Room

User = get_user_model()

REGISTER_URL = '/api/v1/auth/register/'
LOGIN_URL = '/api/v1/auth/login/'
BOOKINGS_URL = '/api/v1/bookings/'


def check_in_url(booking_id):
    return f'{BOOKINGS_URL}{booking_id}/check-in/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='checkin@example.com',
        password='securepass123',
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email='other-checkin@example.com',
        password='securepass123',
    )


@pytest.fixture
def auth_client():
    client = APIClient()
    user_data = {
        'email': 'checkin@example.com',
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
        'email': 'other-checkin@example.com',
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
        name='Check-in Floor',
        building='HQ',
        level='2',
        is_active=True,
    )


@pytest.fixture
def desk(floor):
    return Desk.objects.create(
        floor=floor,
        name='D-10',
        is_active=True,
    )


@pytest.fixture
def room(floor):
    return Room.objects.create(
        floor=floor,
        name='Room C1',
        capacity=6,
        is_active=True,
    )


@pytest.mark.django_db
class TestCheckInService:
    def test_desk_check_in_success(self, user, desk):
        desk_booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        frozen_now = datetime(2026, 7, 10, 9, 30, tzinfo=timezone.utc)

        with patch('django.utils.timezone.now', return_value=frozen_now):
            checked_in = check_in_booking(user, desk_booking)

        assert checked_in.status == Booking.STATUS_CHECKED_IN
        assert checked_in.checked_in_at == frozen_now

    def test_room_check_in_success(self, user, room):
        start = datetime(2026, 7, 10, 14, 0, tzinfo=timezone.utc)
        end = start + timedelta(hours=1)
        room_booking = create_room_booking(user, room.id, start, end)
        frozen_now = datetime(2026, 7, 10, 13, 45, tzinfo=timezone.utc)

        with patch('django.utils.timezone.now', return_value=frozen_now):
            checked_in = check_in_booking(user, room_booking)

        assert checked_in.status == Booking.STATUS_CHECKED_IN
        assert checked_in.checked_in_at == frozen_now

    def test_check_in_rejects_cancelled_booking(self, user, desk):
        desk_booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        desk_booking.status = Booking.STATUS_CANCELLED
        desk_booking.save(update_fields=['status'])
        frozen_now = datetime(2026, 7, 10, 9, 0, tzinfo=timezone.utc)

        with patch('django.utils.timezone.now', return_value=frozen_now):
            with pytest.raises(CheckInNotAllowed, match='cancelled'):
                check_in_booking(user, desk_booking)

    def test_check_in_rejects_already_checked_in(self, user, desk):
        desk_booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        desk_booking.status = Booking.STATUS_CHECKED_IN
        desk_booking.save(update_fields=['status'])
        frozen_now = datetime(2026, 7, 10, 9, 0, tzinfo=timezone.utc)

        with patch('django.utils.timezone.now', return_value=frozen_now):
            with pytest.raises(CheckInNotAllowed, match='already checked in'):
                check_in_booking(user, desk_booking)

    def test_check_in_rejects_before_window(self, user, room):
        start = datetime(2026, 7, 10, 14, 0, tzinfo=timezone.utc)
        end = start + timedelta(hours=1)
        room_booking = create_room_booking(user, room.id, start, end)
        frozen_now = datetime(2026, 7, 10, 13, 0, tzinfo=timezone.utc)

        with patch('django.utils.timezone.now', return_value=frozen_now):
            with pytest.raises(CheckInNotAllowed, match='not opened'):
                check_in_booking(user, room_booking)


@pytest.mark.django_db
class TestCheckInAPI:
    def test_desk_check_in_endpoint(self, auth_client, desk):
        user = User.objects.get(email='checkin@example.com')
        desk_booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        frozen_now = datetime(2026, 7, 10, 9, 0, tzinfo=timezone.utc)

        with patch('django.utils.timezone.now', return_value=frozen_now):
            response = auth_client.post(
                check_in_url(desk_booking.id),
                format='json',
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == Booking.STATUS_CHECKED_IN
        assert response.data['checked_in_at'] is not None

    def test_room_check_in_endpoint(self, auth_client, room):
        user = User.objects.get(email='checkin@example.com')
        start = datetime(2026, 7, 10, 14, 0, tzinfo=timezone.utc)
        end = start + timedelta(hours=1)
        room_booking = create_room_booking(user, room.id, start, end)
        frozen_now = datetime(2026, 7, 10, 13, 45, tzinfo=timezone.utc)

        with patch('django.utils.timezone.now', return_value=frozen_now):
            response = auth_client.post(
                check_in_url(room_booking.id),
                format='json',
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == Booking.STATUS_CHECKED_IN

    def test_check_in_requires_authentication(self, api_client, user, desk):
        desk_booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        response = api_client.post(
            check_in_url(desk_booking.id),
            format='json',
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_check_in_other_users_booking_returns_404(
        self, other_auth_client, user, desk
    ):
        desk_booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        response = other_auth_client.post(
            check_in_url(desk_booking.id), format='json'
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_check_in_invalid_state_returns_400(self, auth_client, desk):
        user = User.objects.get(email='checkin@example.com')
        desk_booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        desk_booking.status = Booking.STATUS_CANCELLED
        desk_booking.save(update_fields=['status'])
        frozen_now = datetime(2026, 7, 10, 9, 0, tzinfo=timezone.utc)

        with patch('django.utils.timezone.now', return_value=frozen_now):
            response = auth_client.post(
                check_in_url(desk_booking.id),
                format='json',
            )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'cancelled' in response.data['detail'].lower()
