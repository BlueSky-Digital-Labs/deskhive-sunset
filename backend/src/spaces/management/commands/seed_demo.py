"""
seed_demo — idempotent bootstrap seeder for the deploy demo admin account.

Guarded by ALLOW_DEMO_SEED (must be true in dev/UAT only). Creates or updates
the demo login user required by the Sunset deploy contract.

Run locally:

    ALLOW_DEMO_SEED=true python manage.py seed_demo
"""

import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

DEMO_EMAIL = 'demo@sunset.dev'


class Command(BaseCommand):
    help = (
        'Seed the demo login user required for deploy smoke tests '
        '(ALLOW_DEMO_SEED must be enabled).'
    )

    def handle(self, *args, **options):
        if not settings.ALLOW_DEMO_SEED:
            raise CommandError(
                'Demo seeding is disabled. Set ALLOW_DEMO_SEED=true in dev/UAT only.'
            )

        with transaction.atomic():
            self._seed_demo_user()

        self.stdout.write(self.style.SUCCESS('seed_demo complete'))

    def _seed_demo_user(self):
        User = get_user_model()
        demo_password = os.environ.get('DEMO_ADMIN_PASSWORD') or 'demo-password-change-me'

        demo, created = User.objects.get_or_create(
            email=DEMO_EMAIL,
            defaults={'is_staff': True, 'is_superuser': True, 'is_active': True},
        )
        demo.is_staff = True
        demo.is_superuser = True
        demo.is_active = True
        demo.set_password(demo_password)
        demo.save()
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Updated'} demo login user {DEMO_EMAIL}"
        ))
