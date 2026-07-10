"""
Tests for desk booking creation, conflicts, and cancellation.
"""

from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from bookings.services import create_desk_booking
from bookings.exceptions import DeskAlreadyBooked, OnePerDayViolation
from spaces.models import Desk, Floor

User = get_user_model()

REGISTER_URL = '/api/v1/auth/register/'
LOGIN_URL = '/api/v1/auth/login/'
BOOKINGS_URL = '/api/v1/bookings/'
DESKS_AVAILABILITY_URL = '/api/v1/availability/desks/'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='booker@example.com',
        password='securepass123',
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email='other@example.com',
        password='securepass123',
    )


@pytest.fixture
def auth_client():
    client = APIClient()
    user_data = {
        'email': 'booker@example.com',
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
        'email': 'other@example.com',
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
        name='Open Plan',
        building='HQ',
        level='3',
        is_active=True,
    )


@pytest.fixture
def desk(floor):
    return Desk.objects.create(floor=floor, name='Desk A1', is_active=True)


@pytest.fixture
def other_desk(floor):
    return Desk.objects.create(floor=floor, name='Desk A2', is_active=True)


@pytest.fixture
def booking_date():
    return date.today() + timedelta(days=1)


@pytest.mark.django_db
class TestDeskBookingService:
    def test_create_desk_booking_success(self, user, desk, booking_date):
        booking = create_desk_booking(user, desk.id, booking_date)

        assert booking.id is not None
        assert booking.user == user
        assert booking.desk == desk
        assert booking.booking_date == booking_date
        assert booking.resource_type == Booking.RESOURCE_TYPE_DESK
        assert booking.status == Booking.STATUS_ACTIVE

    def test_one_per_day_violation(self, user, desk, other_desk, booking_date):
        create_desk_booking(user, desk.id, booking_date)

        with pytest.raises(OnePerDayViolation):
            create_desk_booking(user, other_desk.id, booking_date)

    def test_desk_already_booked(self, user, other_user, desk, booking_date):
        create_desk_booking(user, desk.id, booking_date)

        with pytest.raises(DeskAlreadyBooked):
            create_desk_booking(other_user, desk.id, booking_date)

    def test_cancelled_booking_does_not_block_rebooking(
        self, user, desk, booking_date
    ):
        booking = create_desk_booking(user, desk.id, booking_date)
        booking.status = Booking.STATUS_CANCELLED
        booking.save(update_fields=['status'])

        new_booking = create_desk_booking(user, desk.id, booking_date)
        assert new_booking.status == Booking.STATUS_ACTIVE


@pytest.mark.django_db
class TestDeskBookingAPI:
    def test_create_booking_success(self, auth_client, desk, booking_date):
        payload = {'desk_id': desk.id, 'booking_date': booking_date.isoformat()}
        response = auth_client.post(BOOKINGS_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['desk_id'] == desk.id
        assert response.data['booking_date'] == booking_date.isoformat()
        assert response.data['status'] == Booking.STATUS_ACTIVE
        assert Booking.objects.filter(user__email='booker@example.com').count() == 1

    def test_create_booking_unauthenticated(self, api_client, desk, booking_date):
        payload = {'desk_id': desk.id, 'booking_date': booking_date.isoformat()}
        response = api_client.post(BOOKINGS_URL, payload, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_booking_invalid_desk(self, auth_client, booking_date):
        payload = {'desk_id': 99999, 'booking_date': booking_date.isoformat()}
        response = auth_client.post(BOOKINGS_URL, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_one_per_day_conflict_via_api(
        self, auth_client, desk, other_desk, booking_date
    ):
        payload = {'desk_id': desk.id, 'booking_date': booking_date.isoformat()}
        auth_client.post(BOOKINGS_URL, payload, format='json')

        second_payload = {
            'desk_id': other_desk.id,
            'booking_date': booking_date.isoformat(),
        }
        response = auth_client.post(BOOKINGS_URL, second_payload, format='json')

        assert response.status_code == status.HTTP_409_CONFLICT
        assert 'already has an active desk booking' in response.data['detail']

    def test_desk_conflict_via_api(
        self, auth_client, other_auth_client, desk, booking_date
    ):
        payload = {'desk_id': desk.id, 'booking_date': booking_date.isoformat()}
        auth_client.post(BOOKINGS_URL, payload, format='json')

        response = other_auth_client.post(BOOKINGS_URL, payload, format='json')

        assert response.status_code == status.HTTP_409_CONFLICT
        assert 'already booked' in response.data['detail']

    def test_list_own_bookings(self, auth_client, desk, booking_date):
        payload = {'desk_id': desk.id, 'booking_date': booking_date.isoformat()}
        auth_client.post(BOOKINGS_URL, payload, format='json')

        response = auth_client.get(BOOKINGS_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['desk_id'] == desk.id

    def test_retrieve_own_booking(self, auth_client, desk, booking_date):
        payload = {'desk_id': desk.id, 'booking_date': booking_date.isoformat()}
        create_response = auth_client.post(BOOKINGS_URL, payload, format='json')
        booking_id = create_response.data['id']

        response = auth_client.get(f'{BOOKINGS_URL}{booking_id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == booking_id

    def test_cancel_booking_logical_delete(self, auth_client, desk, booking_date):
        payload = {'desk_id': desk.id, 'booking_date': booking_date.isoformat()}
        create_response = auth_client.post(BOOKINGS_URL, payload, format='json')
        booking_id = create_response.data['id']

        response = auth_client.delete(f'{BOOKINGS_URL}{booking_id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        booking = Booking.objects.get(pk=booking_id)
        assert booking.status == Booking.STATUS_CANCELLED

    def test_cancelled_booking_frees_desk_for_availability(
        self, auth_client, desk, booking_date
    ):
        payload = {'desk_id': desk.id, 'booking_date': booking_date.isoformat()}
        create_response = auth_client.post(BOOKINGS_URL, payload, format='json')
        booking_id = create_response.data['id']

        occupied = auth_client.get(
            DESKS_AVAILABILITY_URL,
            {'date': booking_date.isoformat()},
        )
        assert occupied.data[0]['available'] is False

        auth_client.delete(f'{BOOKINGS_URL}{booking_id}/')

        available = auth_client.get(
            DESKS_AVAILABILITY_URL,
            {'date': booking_date.isoformat()},
        )
        assert available.data[0]['available'] is True

    def test_booking_marks_desk_unavailable(
        self, auth_client, desk, booking_date
    ):
        before = auth_client.get(
            DESKS_AVAILABILITY_URL,
            {'date': booking_date.isoformat()},
        )
        assert before.data[0]['available'] is True

        payload = {'desk_id': desk.id, 'booking_date': booking_date.isoformat()}
        auth_client.post(BOOKINGS_URL, payload, format='json')

        after = auth_client.get(
            DESKS_AVAILABILITY_URL,
            {'date': booking_date.isoformat()},
        )
        assert after.data[0]['available'] is False
