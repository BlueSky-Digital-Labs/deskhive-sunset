from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Case, DateTimeField, F, Q, Value, When
from django.db.models.functions import Cast
from django.db.utils import OperationalError
from django.utils import timezone

from spaces.models import Desk, Room

from .exceptions import (
    CheckInNotAllowed,
    DeskAlreadyBooked,
    OnePerDayViolation,
    RoomAlreadyBooked,
)
from .models import Booking

# Task/API status vocabulary maps to model values: pending/confirmed -> active.
UPCOMING_STATUSES = (Booking.STATUS_ACTIVE, Booking.STATUS_CHECKED_IN)
CANCELLABLE_STATUSES = (Booking.STATUS_ACTIVE,)
PAST_TERMINAL_STATUSES = (Booking.STATUS_CANCELLED, Booking.STATUS_RELEASED)

LAST_AUTO_RELEASE_CACHE_KEY = 'bookings:last_auto_release_run_at'


def _parse_check_in_cutoff_localtime() -> time:
    hour, minute = map(int, settings.CHECK_IN_CUTOFF_LOCALTIME.split(':'))
    return time(hour=hour, minute=minute)


def desk_check_in_cutoff_at(booking: Booking) -> datetime:
    tz = timezone.get_current_timezone()
    cutoff_time = _parse_check_in_cutoff_localtime()
    return timezone.make_aware(datetime.combine(booking.date, cutoff_time), tz)


def desk_auto_release_cutoff_at(booking: Booking) -> datetime:
    grace = timedelta(minutes=settings.AUTO_RELEASE_CUTOFF_MINUTES)
    return desk_check_in_cutoff_at(booking) + grace


def room_auto_release_cutoff_at(booking: Booking) -> datetime:
    grace = timedelta(minutes=settings.AUTO_RELEASE_CUTOFF_MINUTES)
    return booking.start_at + grace


def is_booking_upcoming(booking: Booking) -> bool:
    today = timezone.localdate()
    now = timezone.now()
    if booking.resource_type == Booking.RESOURCE_TYPE_DESK:
        return booking.date >= today
    if booking.resource_type == Booking.RESOURCE_TYPE_ROOM:
        return booking.end_at is not None and booking.end_at >= now
    return False


def filter_bookings_by_bucket(queryset, bucket: str):
    today = timezone.localdate()
    now = timezone.now()
    upcoming_time = Q(resource_type=Booking.RESOURCE_TYPE_DESK, date__gte=today) | Q(
        resource_type=Booking.RESOURCE_TYPE_ROOM,
        end_at__gte=now,
    )
    past_time = Q(resource_type=Booking.RESOURCE_TYPE_DESK, date__lt=today) | Q(
        resource_type=Booking.RESOURCE_TYPE_ROOM,
        end_at__lt=now,
    )

    if bucket == 'upcoming':
        return queryset.filter(upcoming_time, status__in=UPCOMING_STATUSES)
    if bucket == 'past':
        return queryset.filter(past_time | Q(status__in=PAST_TERMINAL_STATUSES))
    return queryset


def annotate_booking_sort_at(queryset):
    return queryset.annotate(
        sort_at=Case(
            When(
                resource_type=Booking.RESOURCE_TYPE_DESK,
                then=Cast('date', DateTimeField()),
            ),
            When(
                resource_type=Booking.RESOURCE_TYPE_ROOM,
                then=F('start_at'),
            ),
            default=Value(None),
            output_field=DateTimeField(),
        )
    )


def create_desk_booking(user, desk_id: int, booking_date: date) -> Booking:
    """
    Create a desk booking with row-level locking on the target desk.

    Raises OnePerDayViolation if the user already has an active desk booking
    on the date. Raises DeskAlreadyBooked if the desk is already reserved.
    """
    with transaction.atomic():
        try:
            desk = (
                Desk.objects.select_for_update(nowait=True)
                .filter(pk=desk_id, is_active=True)
                .get()
            )
        except Desk.DoesNotExist as exc:
            raise Desk.DoesNotExist('Desk not found or inactive.') from exc
        except OperationalError as exc:
            raise DeskAlreadyBooked(
                'Desk is currently being booked by another request.'
            ) from exc

        user_conflict = Booking.objects.filter(
            user=user,
            date=booking_date,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            status__in=Booking.ACTIVE_STATUSES,
        ).exists()
        if user_conflict:
            raise OnePerDayViolation(
                'User already has an active desk booking on this date.'
            )

        desk_conflict = Booking.objects.filter(
            resource_id=desk.id,
            date=booking_date,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            status__in=Booking.ACTIVE_STATUSES,
        ).exists()
        if desk_conflict:
            raise DeskAlreadyBooked('Desk is already booked for this date.')

        try:
            return Booking.objects.create(
                user=user,
                resource_type=Booking.RESOURCE_TYPE_DESK,
                resource_id=desk.id,
                date=booking_date,
                status=Booking.STATUS_ACTIVE,
            )
        except IntegrityError as exc:
            error_message = str(exc).lower()
            if 'unique_active_desk' in error_message:
                if 'user' in error_message or 'user_id' in error_message:
                    raise OnePerDayViolation(
                        'User already has an active desk booking on this date.'
                    ) from exc
                raise DeskAlreadyBooked(
                    'Desk is already booked for this date.'
                ) from exc
            raise


def create_room_booking(
    user,
    room_id: int,
    start_at: datetime,
    end_at: datetime,
) -> Booking:
    """
    Create a room booking with row-level locking and PostgreSQL overlap protection.

    Raises RoomAlreadyBooked when the room is reserved for an overlapping interval
    or when another request holds the room lock.
    """
    if start_at >= end_at:
        raise ValueError('start_at must be before end_at.')

    with transaction.atomic():
        try:
            room = (
                Room.objects.select_for_update(nowait=True)
                .filter(pk=room_id, is_active=True)
                .get()
            )
        except Room.DoesNotExist as exc:
            raise Room.DoesNotExist('Room not found or inactive.') from exc
        except OperationalError as exc:
            raise RoomAlreadyBooked(
                'Room is currently being booked by another request.'
            ) from exc

        overlap_exists = Booking.objects.filter(
            resource_type=Booking.RESOURCE_TYPE_ROOM,
            resource_id=room.id,
            status__in=Booking.ACTIVE_STATUSES,
            start_at__lt=end_at,
            end_at__gt=start_at,
        ).exists()
        if overlap_exists:
            raise RoomAlreadyBooked(
                'Room is already booked for the requested time range.'
            )

        try:
            return Booking.objects.create(
                user=user,
                resource_type=Booking.RESOURCE_TYPE_ROOM,
                resource_id=room.id,
                date=start_at.date(),
                start_at=start_at,
                end_at=end_at,
                status=Booking.STATUS_ACTIVE,
            )
        except IntegrityError as exc:
            raise RoomAlreadyBooked(
                'Room is already booked for the requested time range.'
            ) from exc


def cancel_booking(user, booking: Booking) -> Booking:
    """
    Cancel a booking owned by the given user.

    Idempotent when the booking is already cancelled.
    """
    with transaction.atomic():
        locked_booking = (
            Booking.objects.select_for_update()
            .filter(pk=booking.pk, user=user)
            .get()
        )
        if locked_booking.status != Booking.STATUS_CANCELLED:
            locked_booking.status = Booking.STATUS_CANCELLED
            locked_booking.save(update_fields=['status'])
        return locked_booking


def check_in_booking(user, booking: Booking) -> Booking:
    """
    Mark an active booking as checked in for the owning user.

    Raises CheckInNotAllowed when the booking is not eligible for check-in.
    """
    with transaction.atomic():
        locked_booking = (
            Booking.objects.select_for_update()
            .filter(pk=booking.pk, user=user)
            .get()
        )

        if locked_booking.status == Booking.STATUS_CANCELLED:
            raise CheckInNotAllowed('Cannot check in to a cancelled booking.')
        if locked_booking.status == Booking.STATUS_RELEASED:
            raise CheckInNotAllowed('Cannot check in to a released booking.')
        if locked_booking.status == Booking.STATUS_CHECKED_IN:
            raise CheckInNotAllowed('Booking is already checked in.')
        if locked_booking.status != Booking.STATUS_ACTIVE:
            raise CheckInNotAllowed('Booking is not eligible for check-in.')

        today = timezone.localdate()
        if locked_booking.date != today:
            raise CheckInNotAllowed('Check-in is only allowed on the booking day.')

        now = timezone.now()
        if locked_booking.resource_type == Booking.RESOURCE_TYPE_DESK:
            if now > desk_check_in_cutoff_at(locked_booking):
                raise CheckInNotAllowed('Check-in window has closed for today.')
        elif locked_booking.resource_type == Booking.RESOURCE_TYPE_ROOM:
            if locked_booking.start_at is None or locked_booking.end_at is None:
                raise CheckInNotAllowed('Booking is not eligible for check-in.')
            if now < locked_booking.start_at:
                raise CheckInNotAllowed('Check-in window has not opened yet.')
            if now > locked_booking.end_at:
                raise CheckInNotAllowed('Check-in window has closed.')

        locked_booking.status = Booking.STATUS_CHECKED_IN
        locked_booking.checked_in_at = now
        locked_booking.save(update_fields=['status', 'checked_in_at'])
        return locked_booking


def _is_eligible_for_auto_release(booking: Booking, now: datetime) -> bool:
    if booking.status != Booking.STATUS_ACTIVE:
        return False

    if booking.resource_type == Booking.RESOURCE_TYPE_DESK:
        if booking.date > now.date():
            return False
        return now >= desk_auto_release_cutoff_at(booking)

    if booking.resource_type == Booking.RESOURCE_TYPE_ROOM:
        if booking.start_at is None:
            return False
        return now >= room_auto_release_cutoff_at(booking)

    return False


def auto_release_no_show_bookings() -> dict:
    """
    Release active bookings that were not checked in before their cutoff.

    Uses row-level locks with skip_locked to avoid blocking concurrent workers.
    """
    from django.core.cache import cache

    if not settings.AUTO_RELEASE_ENABLED:
        return {'released': 0, 'enabled': False}

    now = timezone.now()
    released = 0

    with transaction.atomic():
        candidates = (
            Booking.objects.filter(status=Booking.STATUS_ACTIVE)
            .select_for_update(skip_locked=True)
            .order_by('created_at')
        )
        for booking in candidates:
            if _is_eligible_for_auto_release(booking, now):
                booking.status = Booking.STATUS_RELEASED
                booking.save(update_fields=['status'])
                released += 1

    cache.set(LAST_AUTO_RELEASE_CACHE_KEY, now.isoformat(), timeout=None)
    return {'released': released, 'enabled': True, 'run_at': now.isoformat()}
