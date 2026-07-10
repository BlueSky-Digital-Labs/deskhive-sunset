from datetime import date, datetime

from django.db.models import Q

from bookings.models import Booking
from spaces.models import Desk, Room


def _room_interval_overlaps(start: datetime, end: datetime) -> Q:
    return Q(start_at__lt=end) & Q(end_at__gt=start)


def get_desk_availability(target_date: date) -> list[dict]:
    """
    Return desk availability for a given date based on active desk bookings.
    """
    desks = Desk.objects.filter(is_active=True).select_related('floor')
    booked_desk_ids = set(
        Booking.objects.filter(
            date=target_date,
            resource_type=Booking.RESOURCE_TYPE_DESK,
            status__in=Booking.ACTIVE_STATUSES,
        ).values_list('resource_id', flat=True)
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
    Return room availability for a given time range based on active room bookings.
    """
    rooms = Room.objects.filter(is_active=True).select_related('floor')
    booked_room_ids = set(
        Booking.objects.filter(
            resource_type=Booking.RESOURCE_TYPE_ROOM,
            status__in=Booking.ACTIVE_STATUSES,
        )
        .filter(_room_interval_overlaps(start, end))
        .values_list('resource_id', flat=True)
    )
    return [
        {
            'id': room.id,
            'name': room.name,
            'floor': room.floor_id,
            'capacity': room.capacity,
            'available': room.id not in booked_room_ids,
        }
        for room in rooms
    ]
