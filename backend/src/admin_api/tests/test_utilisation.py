"""
Tests for the admin utilisation summary endpoint.
"""

from datetime import date, datetime, timezone

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from spaces.models import Desk, Floor, Room

User = get_user_model()

UTILISATION_URL = '/api/v1/admin/utilisation'


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='util-user@example.com',
        password='securepass123',
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email='admin@example.com',
        password='adminpass123',
    )


@pytest.fixture
def floor(db):
    return Floor.objects.create(
        name='Metrics Floor',
        building='HQ',
        level='2',
        is_active=True,
    )


@pytest.fixture
def other_floor(db):
    return Floor.objects.create(
        name='Other Floor',
        building='HQ',
        level='4',
        is_active=True,
    )


@pytest.fixture
def desk(floor):
    return Desk.objects.create(floor=floor, name='D-1', is_active=True)


@pytest.fixture
def other_desk(other_floor):
    return Desk.objects.create(floor=other_floor, name='D-99', is_active=True)


@pytest.fixture
def room(floor):
    return Room.objects.create(
        floor=floor,
        name='R-1',
        capacity=6,
        is_active=True,
    )


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.mark.django_db
class TestUtilisationEndpoint:
    def test_requires_admin(self, api_client, user, desk):
        api_client.force_authenticate(user=user)
        response = api_client.get(
            UTILISATION_URL,
            {'start_date': '2026-07-10', 'end_date': '2026-07-10'},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_requires_date_params(self, admin_client):
        response = admin_client.get(UTILISATION_URL)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_date_format(self, admin_client):
        response = admin_client.get(
            UTILISATION_URL,
            {'start_date': 'bad', 'end_date': '2026-07-10'},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_start_after_end_rejected(self, admin_client):
        response = admin_client.get(
            UTILISATION_URL,
            {'start_date': '2026-07-12', 'end_date': '2026-07-10'},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_summary_and_daily_metrics(
        self,
        admin_client,
        user,
        desk,
        room,
    ):
        day_one = date(2026, 7, 10)
        day_two = date(2026, 7, 11)

        Booking.objects.create(
            user=user,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id=desk.id,
            date=day_one,
            status=Booking.STATUS_CHECKED_IN,
        )
        Booking.objects.create(
            user=user,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id=desk.id,
            date=day_two,
            status=Booking.STATUS_ACTIVE,
        )
        Booking.objects.create(
            user=user,
            resource_type=Booking.RESOURCE_TYPE_ROOM,
            resource_id=room.id,
            date=day_one,
            start_at=datetime(2026, 7, 10, 9, 0, tzinfo=timezone.utc),
            end_at=datetime(2026, 7, 10, 10, 0, tzinfo=timezone.utc),
            status=Booking.STATUS_CHECKED_IN,
        )
        Booking.objects.create(
            user=user,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id=desk.id,
            date=day_one,
            status=Booking.STATUS_CANCELLED,
        )

        response = admin_client.get(
            UTILISATION_URL,
            {'start_date': day_one.isoformat(), 'end_date': day_two.isoformat()},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['start_date'] == day_one.isoformat()
        assert response.data['end_date'] == day_two.isoformat()
        assert response.data['floor_id'] is None

        summary = response.data['summary']
        assert summary['desks']['resource_count'] == 1
        assert summary['desks']['bookings_count'] == 2
        assert summary['desks']['checked_in_count'] == 1
        assert summary['desks']['utilisation_rate'] == 1.0

        assert summary['rooms']['resource_count'] == 1
        assert summary['rooms']['bookings_count'] == 1
        assert summary['rooms']['checked_in_count'] == 1
        assert summary['rooms']['utilisation_rate'] == 0.5

        assert len(response.data['daily']) == 2
        assert response.data['daily'][0]['date'] == day_one.isoformat()
        assert response.data['daily'][0]['desks']['bookings_count'] == 1
        assert response.data['daily'][1]['desks']['bookings_count'] == 1

    def test_floor_filter_limits_resources(
        self,
        admin_client,
        user,
        desk,
        other_desk,
        room,
    ):
        other_user = User.objects.create_user(
            email='other-util@example.com',
            password='securepass123',
        )
        booking_date = date(2026, 7, 10)
        Booking.objects.create(
            user=user,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id=desk.id,
            date=booking_date,
            status=Booking.STATUS_ACTIVE,
        )
        Booking.objects.create(
            user=other_user,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id=other_desk.id,
            date=booking_date,
            status=Booking.STATUS_ACTIVE,
        )

        response = admin_client.get(
            UTILISATION_URL,
            {
                'start_date': booking_date.isoformat(),
                'end_date': booking_date.isoformat(),
                'floor_id': desk.floor_id,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['floor_id'] == desk.floor_id
        assert response.data['summary']['desks']['resource_count'] == 1
        assert response.data['summary']['desks']['bookings_count'] == 1
        assert response.data['summary']['rooms']['resource_count'] == 1

    def test_empty_range_returns_zero_metrics(self, admin_client, desk, room):
        response = admin_client.get(
            UTILISATION_URL,
            {'start_date': '2026-07-10', 'end_date': '2026-07-10'},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['summary']['desks']['bookings_count'] == 0
        assert response.data['summary']['desks']['utilisation_rate'] == 0.0
        assert response.data['daily'][0]['desks']['bookings_count'] == 0
