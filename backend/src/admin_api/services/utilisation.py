from datetime import date, timedelta

from bookings.models import Booking
from spaces.models import Desk, Room

UTILISATION_STATUSES = (
    Booking.STATUS_ACTIVE,
    Booking.STATUS_CHECKED_IN,
    Booking.STATUS_RELEASED,
)


def _parse_floor_id(floor_id):
    if floor_id is None or floor_id == '':
        return None
    return int(floor_id)


def _desk_queryset(floor_id):
    queryset = Desk.objects.filter(is_active=True)
    if floor_id is not None:
        queryset = queryset.filter(floor_id=floor_id)
    return queryset


def _room_queryset(floor_id):
    queryset = Room.objects.filter(is_active=True)
    if floor_id is not None:
        queryset = queryset.filter(floor_id=floor_id)
    return queryset


def _resource_metrics(bookings_qs, resource_count, day_count):
    bookings_count = bookings_qs.count()
    checked_in_count = bookings_qs.filter(
        status=Booking.STATUS_CHECKED_IN,
    ).count()
    capacity = resource_count * day_count
    utilisation_rate = (
        round(bookings_count / capacity, 4) if capacity else 0.0
    )
    return {
        'resource_count': resource_count,
        'bookings_count': bookings_count,
        'checked_in_count': checked_in_count,
        'utilisation_rate': utilisation_rate,
    }


def _daily_resource_metrics(bookings_qs, resource_count):
    bookings_count = bookings_qs.count()
    checked_in_count = bookings_qs.filter(
        status=Booking.STATUS_CHECKED_IN,
    ).count()
    utilisation_rate = (
        round(bookings_count / resource_count, 4) if resource_count else 0.0
    )
    return {
        'bookings_count': bookings_count,
        'checked_in_count': checked_in_count,
        'utilisation_rate': utilisation_rate,
    }


def build_utilisation_report(start_date, end_date, floor_id=None):
    """
    Aggregate desk and room booking utilisation between two dates.

    Desk bookings are matched on ``Booking.date``. Room bookings are matched
    when ``Booking.date`` falls within the requested range. Cancelled bookings
    are excluded from utilisation counts.
    """
    floor_id = _parse_floor_id(floor_id)
    desk_ids = list(_desk_queryset(floor_id).values_list('id', flat=True))
    room_ids = list(_room_queryset(floor_id).values_list('id', flat=True))
    desk_count = len(desk_ids)
    room_count = len(room_ids)

    day_count = (end_date - start_date).days + 1

    base_bookings = Booking.objects.filter(
        date__gte=start_date,
        date__lte=end_date,
        status__in=UTILISATION_STATUSES,
    )

    desk_bookings = base_bookings.filter(
        resource_type=Booking.RESOURCE_TYPE_DESK,
        resource_id__in=desk_ids,
    )
    room_bookings = base_bookings.filter(
        resource_type=Booking.RESOURCE_TYPE_ROOM,
        resource_id__in=room_ids,
    )

    summary = {
        'desks': _resource_metrics(desk_bookings, desk_count, day_count),
        'rooms': _resource_metrics(room_bookings, room_count, day_count),
    }

    daily = []
    current = start_date
    while current <= end_date:
        daily_desk_bookings = desk_bookings.filter(date=current)
        daily_room_bookings = room_bookings.filter(date=current)
        daily.append(
            {
                'date': current.isoformat(),
                'desks': _daily_resource_metrics(daily_desk_bookings, desk_count),
                'rooms': _daily_resource_metrics(daily_room_bookings, room_count),
            }
        )
        current += timedelta(days=1)

    return {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'floor_id': floor_id,
        'summary': summary,
        'daily': daily,
    }
