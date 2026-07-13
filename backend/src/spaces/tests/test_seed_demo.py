"""
Tests for the seed_demo management command.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError

User = get_user_model()

DEMO_EMAIL = 'demo@sunset.dev'


@pytest.fixture
def allow_demo_seed(settings):
    settings.ALLOW_DEMO_SEED = True


class TestSeedDemoGuard:
    def test_raises_when_allow_demo_seed_false(self, settings):
        settings.ALLOW_DEMO_SEED = False

        with pytest.raises(CommandError, match='Demo seeding is disabled'):
            call_command('seed_demo')


@pytest.mark.django_db
class TestSeedDemoCreates:
    def test_creates_demo_admin_user(self, allow_demo_seed):
        call_command('seed_demo')

        user = User.objects.get(email=DEMO_EMAIL)
        assert user.is_staff is True
        assert user.is_superuser is True
        assert user.is_active is True

    def test_is_idempotent(self, allow_demo_seed):
        call_command('seed_demo')
        user_count = User.objects.filter(email=DEMO_EMAIL).count()

        call_command('seed_demo')

        assert User.objects.filter(email=DEMO_EMAIL).count() == user_count

    def test_updates_existing_demo_user_password(self, allow_demo_seed, monkeypatch):
        monkeypatch.setenv('DEMO_ADMIN_PASSWORD', 'first-password')
        call_command('seed_demo')

        user = User.objects.get(email=DEMO_EMAIL)
        assert user.check_password('first-password')

        monkeypatch.setenv('DEMO_ADMIN_PASSWORD', 'second-password')
        call_command('seed_demo')

        user.refresh_from_db()
        assert user.check_password('second-password')
