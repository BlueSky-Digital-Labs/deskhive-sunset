"""
Tests for auto-release no-show Celery task and health endpoint.
"""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from bookings.services import (
    LAST_AUTO_RELEASE_CACHE_KEY,
    auto_release_no_show_bookings,
    create_desk_booking,
    create_room_booking,
)
from bookings.tasks import auto_release_no_shows
from spaces.models import Desk, Floor, Room

User = get_user_model()

AUTO_RELEASE_HEALTH_URL = '/api/v1/admin/auto_release_health'


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='norelease@example.com',
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
        name='Release Floor',
        building='HQ',
        level='3',
        is_active=True,
    )


@pytest.fixture
def desk(floor):
    return Desk.objects.create(
        floor=floor,
        name='D-20',
        is_active=True,
    )


@pytest.fixture
def room(floor):
    return Room.objects.create(
        floor=floor,
        name='Room D1',
        capacity=4,
        is_active=True,
    )


@pytest.fixture(autouse=True)
def clear_auto_release_cache():
    cache.delete(LAST_AUTO_RELEASE_CACHE_KEY)
    yield
    cache.delete(LAST_AUTO_RELEASE_CACHE_KEY)


@pytest.mark.django_db
class TestAutoReleaseService:
    def test_releases_overdue_desk_booking(self, user, desk):
        booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        frozen_now = datetime(2026, 7, 10, 10, 30, tzinfo=timezone.utc)

        with patch('bookings.services.timezone.now', return_value=frozen_now):
            result = auto_release_no_show_bookings()

        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_RELEASED
        assert result['released'] == 1
        assert result['enabled'] is True
        assert cache.get(LAST_AUTO_RELEASE_CACHE_KEY) == frozen_now.isoformat()

    def test_releases_overdue_room_booking(self, user, room):
        start = datetime(2026, 7, 10, 9, 0, tzinfo=timezone.utc)
        end = start + timedelta(hours=1)
        booking = create_room_booking(user, room.id, start, end)
        frozen_now = start + timedelta(minutes=20)

        with patch('bookings.services.timezone.now', return_value=frozen_now):
            result = auto_release_no_show_bookings()

        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_RELEASED
        assert result['released'] == 1

    def test_skips_checked_in_bookings(self, user, desk):
        check_in_time = datetime(2026, 7, 10, 9, 0, tzinfo=timezone.utc)
        booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        booking.status = Booking.STATUS_CHECKED_IN
        booking.checked_in_at = check_in_time
        booking.save(update_fields=['status', 'checked_in_at'])
        frozen_now = datetime(2026, 7, 10, 11, 0, tzinfo=timezone.utc)

        with patch('bookings.services.timezone.now', return_value=frozen_now):
            result = auto_release_no_show_bookings()

        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_CHECKED_IN
        assert result['released'] == 0

    def test_skips_bookings_before_cutoff(self, user, desk):
        booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        frozen_now = datetime(2026, 7, 10, 9, 30, tzinfo=timezone.utc)

        with patch('bookings.services.timezone.now', return_value=frozen_now):
            result = auto_release_no_show_bookings()

        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_ACTIVE
        assert result['released'] == 0

    @override_settings(AUTO_RELEASE_ENABLED=False)
    def test_respects_disabled_setting(self, user, desk):
        create_desk_booking(user, desk.id, date(2026, 7, 10))

        result = auto_release_no_show_bookings()

        assert result == {'released': 0, 'enabled': False}
        assert cache.get(LAST_AUTO_RELEASE_CACHE_KEY) is None

    def test_concurrency_skips_locked_rows(self, user, desk):
        booking = create_desk_booking(user, desk.id, date(2026, 7, 10))
        frozen_now = datetime(2026, 7, 10, 11, 0, tzinfo=timezone.utc)
        locked_queryset = MagicMock()
        locked_queryset.__iter__.return_value = iter([])
        locked_queryset.order_by.return_value = locked_queryset

        with patch('bookings.services.timezone.now', return_value=frozen_now):
            with patch('bookings.models.Booking.objects.filter') as mock_filter:
                mock_filter.return_value.select_for_update.return_value = locked_queryset
                result = auto_release_no_show_bookings()

        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_ACTIVE
        assert result['released'] == 0
        mock_filter.return_value.select_for_update.assert_called_once_with(
            skip_locked=True
        )


@pytest.mark.django_db
class TestAutoReleaseTask:
    def test_celery_task_delegates_to_service(self, user, desk):
        create_desk_booking(user, desk.id, date(2026, 7, 10))
        frozen_now = datetime(2026, 7, 10, 11, 0, tzinfo=timezone.utc)

        with patch('bookings.services.timezone.now', return_value=frozen_now):
            result = auto_release_no_shows()

        assert result['released'] == 1
        assert result['enabled'] is True

    @override_settings(AUTO_RELEASE_ENABLED=False)
    def test_celery_task_skips_when_disabled(self):
        result = auto_release_no_shows()
        assert result == {'released': 0, 'enabled': False, 'skipped': True}


@pytest.mark.django_db
class TestAutoReleaseHealthEndpoint:
    def test_health_endpoint_requires_admin(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(AUTO_RELEASE_HEALTH_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_health_endpoint_returns_last_run_timestamp(self, admin_user):
        run_at = datetime(2026, 7, 10, 11, 0, tzinfo=timezone.utc).isoformat()
        cache.set(LAST_AUTO_RELEASE_CACHE_KEY, run_at)

        client = APIClient()
        client.force_authenticate(user=admin_user)
        response = client.get(AUTO_RELEASE_HEALTH_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'ok'
        assert response.data['last_auto_release_run_at'] == run_at

    def test_health_endpoint_returns_null_when_not_run_yet(self, admin_user):
        client = APIClient()
        client.force_authenticate(user=admin_user)
        response = client.get(AUTO_RELEASE_HEALTH_URL)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['last_auto_release_run_at'] is None
