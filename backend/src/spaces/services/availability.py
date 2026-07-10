from datetime import date, datetime

from spaces.models import Desk, Room


def get_desk_availability(target_date: date) -> list[dict]:
    """
    Return desk availability for a given date.

    Placeholder implementation: all active desks are marked available until
    booking dependencies are integrated.
    """
    desks = Desk.objects.filter(is_active=True).select_related('floor')
    return [
        {
            'id': desk.id,
            'name': desk.name,
            'floor': desk.floor_id,
            'available': True,
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
