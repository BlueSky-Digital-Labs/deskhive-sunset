"""
seed_demo — idempotent demo-data seeder for users, spaces, and bookings.

Guarded by ALLOW_DEMO_SEED (must be true in dev/UAT only). All seeded space
entities use a DEMO- name prefix so they can be removed with --clear.

Run locally:

    ALLOW_DEMO_SEED=true python manage.py seed_demo
    ALLOW_DEMO_SEED=true python manage.py seed_demo --clear
"""

import os
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from bookings.models import Booking
from spaces.models import Desk, Floor, Room

DEMO_PREFIX = 'DEMO-'
DEMO_BUILDING = 'DEMO'

DEMO_EMAIL = 'demo@sunset.dev'
SAMPLE_USERS = [
    'alice@example.com',
    'bob@example.com',
    'carol@example.com',
    'dave@example.com',
    'erin@example.com',
]
SAMPLE_PASSWORD = 'demo-sample-pass'

DEMO_FLOORS = [
    {'building': DEMO_BUILDING, 'level': '1', 'name': f'{DEMO_PREFIX}Floor-1'},
    {'building': DEMO_BUILDING, 'level': '2', 'name': f'{DEMO_PREFIX}Floor-2'},
]

DEMO_DESKS = [
    f'{DEMO_PREFIX}Desk-01',
    f'{DEMO_PREFIX}Desk-02',
    f'{DEMO_PREFIX}Desk-03',
    f'{DEMO_PREFIX}Desk-04',
    f'{DEMO_PREFIX}Desk-05',
    f'{DEMO_PREFIX}Desk-06',
]

DEMO_ROOMS = [
    {'name': f'{DEMO_PREFIX}Room-Conference', 'capacity': 10},
    {'name': f'{DEMO_PREFIX}Room-Huddle', 'capacity': 4},
]


class Command(BaseCommand):
    help = (
        'Seed idempotent demo data: demo login user, sample users, floors, '
        'desks, rooms, and bookings (ALLOW_DEMO_SEED must be enabled).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all DEMO- prefixed entities before seeding.',
        )

    def handle(self, *args, **options):
        if not settings.ALLOW_DEMO_SEED:
            raise CommandError(
                'Demo seeding is disabled. Set ALLOW_DEMO_SEED=true in dev/UAT only.'
            )

        if options['clear']:
            self._clear_demo_entities()
            self.stdout.write(self.style.WARNING('Cleared existing demo entities.'))

        with transaction.atomic():
            self._seed_users()
            floors = self._seed_floors()
            desks = self._seed_desks(floors[0])
            rooms = self._seed_rooms(floors[1])
            self._seed_bookings(desks, rooms)

        self.stdout.write(self.style.SUCCESS('seed_demo complete'))

    def _clear_demo_entities(self):
        demo_desk_ids = list(
            Desk.objects.filter(name__startswith=DEMO_PREFIX).values_list('id', flat=True)
        )
        demo_room_ids = list(
            Room.objects.filter(name__startswith=DEMO_PREFIX).values_list('id', flat=True)
        )

        Booking.objects.filter(
            resource_type=Booking.RESOURCE_TYPE_DESK,
            resource_id__in=demo_desk_ids,
        ).delete()
        Booking.objects.filter(
            resource_type=Booking.RESOURCE_TYPE_ROOM,
            resource_id__in=demo_room_ids,
        ).delete()

        Floor.objects.filter(
            Q(name__startswith=DEMO_PREFIX) | Q(building=DEMO_BUILDING)
        ).delete()

    def _seed_users(self):
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

        created_count = 0
        for email in SAMPLE_USERS:
            user, was_new = User.objects.get_or_create(
                email=email, defaults={'is_active': True}
            )
            if was_new:
                user.set_password(SAMPLE_PASSWORD)
                user.save()
                created_count += 1
        self.stdout.write(self.style.SUCCESS(
            f'Sample users: {created_count} created, '
            f'{len(SAMPLE_USERS) - created_count} already present'
        ))

    def _seed_floors(self):
        floors = []
        for floor_data in DEMO_FLOORS:
            try:
                floor, created = Floor.objects.get_or_create(
                    building=floor_data['building'],
                    level=floor_data['level'],
                    name=floor_data['name'],
                    defaults={'is_active': True},
                )
            except IntegrityError:
                floor = Floor.objects.get(
                    building=floor_data['building'],
                    level=floor_data['level'],
                    name=floor_data['name'],
                )
                created = False
            floors.append(floor)
            self.stdout.write(
                f"{'Created' if created else 'Found'} floor {floor.name}"
            )
        return floors

    def _seed_desks(self, floor):
        desks = []
        for desk_name in DEMO_DESKS:
            try:
                desk, created = Desk.objects.get_or_create(
                    floor=floor,
                    name=desk_name,
                    defaults={'is_active': True},
                )
            except IntegrityError:
                desk = Desk.objects.get(floor=floor, name=desk_name)
                created = False
            desks.append(desk)
            self.stdout.write(
                f"{'Created' if created else 'Found'} desk {desk.name}"
            )
        return desks

    def _seed_rooms(self, floor):
        rooms = []
        for room_data in DEMO_ROOMS:
            try:
                room, created = Room.objects.get_or_create(
                    floor=floor,
                    name=room_data['name'],
                    defaults={
                        'capacity': room_data['capacity'],
                        'is_active': True,
                    },
                )
            except IntegrityError:
                room = Room.objects.get(floor=floor, name=room_data['name'])
                created = False
            rooms.append(room)
            self.stdout.write(
                f"{'Created' if created else 'Found'} room {room.name}"
            )
        return rooms

    def _seed_bookings(self, desks, rooms):
        User = get_user_model()
        users_by_email = {
            email: User.objects.get(email=email) for email in SAMPLE_USERS[:4]
        }

        today = timezone.localdate()
        tomorrow = today + timedelta(days=1)
        tz = timezone.get_current_timezone()

        desk_bookings = [
            (users_by_email['alice@example.com'], desks[0], today),
            (users_by_email['bob@example.com'], desks[1], today),
            (users_by_email['carol@example.com'], desks[2], tomorrow),
            (users_by_email['dave@example.com'], desks[3], tomorrow),
        ]

        for user, desk, booking_date in desk_bookings:
            self._create_desk_booking(user, desk, booking_date)

        conference_room = rooms[0]
        huddle_room = rooms[1]
        room_bookings = [
            (
                users_by_email['alice@example.com'],
                conference_room,
                timezone.make_aware(datetime.combine(today, time(10, 0)), tz),
                timezone.make_aware(datetime.combine(today, time(11, 0)), tz),
            ),
            (
                users_by_email['bob@example.com'],
                huddle_room,
                timezone.make_aware(datetime.combine(today, time(14, 0)), tz),
                timezone.make_aware(datetime.combine(today, time(15, 0)), tz),
            ),
        ]

        for user, room, start_at, end_at in room_bookings:
            self._create_room_booking(user, room, start_at, end_at)

    def _create_desk_booking(self, user, desk, booking_date: date):
        try:
            booking, created = Booking.objects.get_or_create(
                user=user,
                resource_type=Booking.RESOURCE_TYPE_DESK,
                resource_id=desk.id,
                date=booking_date,
                defaults={'status': Booking.STATUS_ACTIVE},
            )
        except IntegrityError:
            self.stdout.write(
                self.style.WARNING(
                    f'Skipped desk booking for {user.email} on {booking_date} '
                    f'(constraint conflict).'
                )
            )
            return

        if created:
            self.stdout.write(
                f'Created desk booking: {user.email} -> {desk.name} on {booking_date}'
            )

    def _create_room_booking(self, user, room, start_at: datetime, end_at: datetime):
        try:
            booking, created = Booking.objects.get_or_create(
                user=user,
                resource_type=Booking.RESOURCE_TYPE_ROOM,
                resource_id=room.id,
                date=start_at.date(),
                start_at=start_at,
                end_at=end_at,
                defaults={'status': Booking.STATUS_ACTIVE},
            )
        except IntegrityError:
            self.stdout.write(
                self.style.WARNING(
                    f'Skipped room booking for {user.email} in {room.name} '
                    f'(constraint conflict).'
                )
            )
            return

        if created:
            self.stdout.write(
                f'Created room booking: {user.email} -> {room.name} '
                f'({start_at.time()}–{end_at.time()})'
            )
