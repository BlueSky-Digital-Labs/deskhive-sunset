from datetime import date, datetime

from bookings.models import Booking
from spaces.models import Desk, Room


def get_desk_availability(target_date: date) -> list[dict]:
    """
    Return desk availability for a given date based on active desk bookings.
    """
    desks = Desk.objects.filter(is_active=True).select_related('floor')
    booked_desk_ids = set(
        Booking.objects.filter(
            booking_date=target_date,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            status__in=Booking.ACTIVE_STATUSES,
            desk_id__isnull=False,
        ).values_list('desk_id', flat=True)
    )
    return [
        {
            'id': desk.id,
            'name': desk.name,
            'floor': desk.floor_id,
            'available': desk.id not in booked_desk_ids,
        }
        for desk in desks
    ]


def get_room_availability(start: datetime, end: datetime) -> list[dict]:
    """
    Return room availability for a given time range.

    Placeholder implementation: all active rooms are marked available until
    booking dependencies are integrated.
    """
    rooms = Room.objects.filter(is_active=True).select_related('floor')
    return [
        {
            'id': room.id,
            'name': room.name,
            'floor': room.floor_id,
            'capacity': room.capacity,
            'available': True,
        }
        for room in rooms
    ]
