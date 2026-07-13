"""
Tests for the seed_demo management command.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError

from bookings.models import Booking
from spaces.models import Desk, Floor, Room

User = get_user_model()

DEMO_PREFIX = 'DEMO-'


@pytest.fixture
def allow_demo_seed(settings):
    settings.ALLOW_DEMO_SEED = True


@pytest.mark.django_db
class TestSeedDemoGuard:
    def test_raises_when_allow_demo_seed_false(self):
        with pytest.raises(CommandError, match='Demo seeding is disabled'):
            call_command('seed_demo')


@pytest.mark.django_db
class TestSeedDemoCreates:
    def test_creates_demo_entities(self, allow_demo_seed):
        call_command('seed_demo')

        assert Floor.objects.filter(name__startswith=DEMO_PREFIX).count() == 2
        assert Desk.objects.filter(name__startswith=DEMO_PREFIX).count() == 6
        assert Room.objects.filter(name__startswith=DEMO_PREFIX).count() == 2

        demo_desk_ids = Desk.objects.filter(
            name__startswith=DEMO_PREFIX
        ).values_list('id', flat=True)
        demo_room_ids = Room.objects.filter(
            name__startswith=DEMO_PREFIX
        ).values_list('id', flat=True)

        assert Booking.objects.filter(
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id__in=demo_desk_ids,
        ).count() == 4
        assert Booking.objects.filter(
            resource_type=Booking.RESOURCE_TYPE_ROOM,
            resource_id__in=demo_room_ids,
        ).count() == 2

        assert User.objects.filter(email='demo@sunset.dev').exists()
        assert User.objects.filter(email='alice@example.com').exists()

    def test_is_idempotent(self, allow_demo_seed):
        call_command('seed_demo')
        floor_count = Floor.objects.filter(name__startswith=DEMO_PREFIX).count()
        desk_count = Desk.objects.filter(name__startswith=DEMO_PREFIX).count()

        call_command('seed_demo')

        assert Floor.objects.filter(name__startswith=DEMO_PREFIX).count() == floor_count
        assert Desk.objects.filter(name__startswith=DEMO_PREFIX).count() == desk_count


@pytest.mark.django_db
class TestSeedDemoClear:
    def test_clear_removes_and_reseeds_demo_entities(self, allow_demo_seed):
        call_command('seed_demo')
        assert Desk.objects.filter(name__startswith=DEMO_PREFIX).count() == 6

        call_command('seed_demo', clear=True)

        assert Floor.objects.filter(name__startswith=DEMO_PREFIX).count() == 2
        assert Desk.objects.filter(name__startswith=DEMO_PREFIX).count() == 6
        assert Room.objects.filter(name__startswith=DEMO_PREFIX).count() == 2

        demo_desk_ids = Desk.objects.filter(
            name__startswith=DEMO_PREFIX
        ).values_list('id', flat=True)
        assert Booking.objects.filter(
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id__in=demo_desk_ids,
        ).count() == 4
