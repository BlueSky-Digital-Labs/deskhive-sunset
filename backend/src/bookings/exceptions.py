class OnePerDayViolation(Exception):
    """Raised when a user already has an active desk booking on the given date."""


class DeskAlreadyBooked(Exception):
    """Raised when the target desk is already booked for the given date."""


class RoomAlreadyBooked(Exception):
    """Raised when the target room has an overlapping active booking."""


class CheckInNotAllowed(Exception):
    """Raised when a booking cannot be checked in."""
