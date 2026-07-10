from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
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


def _desk_check_in_deadline_time() -> time:
    raw = settings.BOOKING_DESK_CHECK_IN_DEADLINE_TIME
    hour, minute = map(int, raw.split(':'))
    return time(hour=hour, minute=minute)


def desk_auto_release_cutoff(booking: Booking) -> datetime:
    """Return when an unchecked desk booking should be auto-released."""
    deadline_time = _desk_check_in_deadline_time()
    tz = timezone.get_current_timezone()
    deadline = timezone.make_aware(
        datetime.combine(booking.date, deadline_time),
        tz,
    )
    grace = timedelta(minutes=settings.BOOKING_AUTO_RELEASE_GRACE_MINUTES)
    return deadline + grace


def room_auto_release_cutoff(booking: Booking) -> datetime:
    """Return when an unchecked room booking should be auto-released."""
    grace = timedelta(minutes=settings.BOOKING_AUTO_RELEASE_GRACE_MINUTES)
    return booking.start_at + grace


def check_in_opens_at(booking: Booking) -> datetime:
    early = timedelta(minutes=settings.BOOKING_CHECK_IN_EARLY_MINUTES)
    if booking.resource_type == Booking.RESOURCE_TYPE_DESK:
        tz = timezone.get_current_timezone()
        return timezone.make_aware(
            datetime.combine(booking.date, time.min),
            tz,
        )
    return booking.start_at - early


def check_in_closes_at(booking: Booking) -> datetime:
    if booking.resource_type == Booking.RESOURCE_TYPE_DESK:
        return desk_auto_release_cutoff(booking)
    return booking.end_at


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

    Raises CheckInNotAllowed when the booking is not eligible or outside
    the check-in window.
    """
    with transaction.atomic():
        locked_booking = (
            Booking.objects.select_for_update()
            .filter(pk=booking.pk, user=user)
            .get()
        )

        if locked_booking.status == Booking.STATUS_CANCELLED:
            raise CheckInNotAllowed('Cannot check in to a cancelled booking.')
        if locked_booking.status == Booking.STATUS_CHECKED_IN:
            raise CheckInNotAllowed('Booking is already checked in.')
        if locked_booking.status != Booking.STATUS_ACTIVE:
            raise CheckInNotAllowed('Booking is not eligible for check-in.')

        now = timezone.now()
        opens_at = check_in_opens_at(locked_booking)
        closes_at = check_in_closes_at(locked_booking)

        if now < opens_at:
            raise CheckInNotAllowed('Check-in window has not opened yet.')
        if now > closes_at:
            raise CheckInNotAllowed('Check-in window has closed.')

        locked_booking.status = Booking.STATUS_CHECKED_IN
        locked_booking.checked_in_at = now
        locked_booking.save(update_fields=['status', 'checked_in_at'])
        return locked_booking


def release_no_show_bookings() -> dict:
    """
    Cancel active bookings not checked in before their release cutoff.

    Returns a summary dict with the number of bookings released.
    """
    if not settings.BOOKING_AUTO_RELEASE_ENABLED:
        return {'released': 0, 'enabled': False}

    now = timezone.now()
    released = 0

    desk_candidates = Booking.objects.filter(
        status=Booking.STATUS_ACTIVE,
        resource_type=Booking.RESOURCE_TYPE_DESK,
        date__lte=now.date(),
    )
    for booking in desk_candidates.iterator():
        if now > desk_auto_release_cutoff(booking):
            booking.status = Booking.STATUS_CANCELLED
            booking.save(update_fields=['status'])
            released += 1

    room_candidates = Booking.objects.filter(
        status=Booking.STATUS_ACTIVE,
        resource_type=Booking.RESOURCE_TYPE_ROOM,
        start_at__isnull=False,
    )
    for booking in room_candidates.iterator():
        if now > room_auto_release_cutoff(booking):
            booking.status = Booking.STATUS_CANCELLED
            booking.save(update_fields=['status'])
            released += 1

    return {'released': released, 'enabled': True}
