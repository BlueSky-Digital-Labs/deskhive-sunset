from datetime import date

from django.db import transaction
from django.db.utils import OperationalError

from spaces.models import Desk

from .exceptions import DeskAlreadyBooked, OnePerDayViolation
from .models import Booking


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
            booking_date=booking_date,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            status__in=Booking.ACTIVE_STATUSES,
        ).exists()
        if user_conflict:
            raise OnePerDayViolation(
                'User already has an active desk booking on this date.'
            )

        desk_conflict = Booking.objects.filter(
            desk=desk,
            booking_date=booking_date,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            status__in=Booking.ACTIVE_STATUSES,
        ).exists()
        if desk_conflict:
            raise DeskAlreadyBooked('Desk is already booked for this date.')

        return Booking.objects.create(
            user=user,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            desk=desk,
            booking_date=booking_date,
            status=Booking.STATUS_ACTIVE,
        )
