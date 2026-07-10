from django.conf import settings
from django.db import models


class Booking(models.Model):
    RESOURCE_TYPE_DESK = 'desk'
    RESOURCE_TYPE_ROOM = 'room'
    RESOURCE_TYPE_CHOICES = [
        (RESOURCE_TYPE_DESK, 'Desk'),
        (RESOURCE_TYPE_ROOM, 'Room'),
    ]

    STATUS_ACTIVE = 'active'
    STATUS_CHECKED_IN = 'checked_in'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_CHECKED_IN, 'Checked in'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    ACTIVE_STATUSES = (STATUS_ACTIVE, STATUS_CHECKED_IN)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings',
        db_index=True,
    )
    resource_type = models.CharField(
        max_length=10,
        choices=RESOURCE_TYPE_CHOICES,
    )
    desk = models.ForeignKey(
        'spaces.Desk',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='bookings',
        db_index=True,
    )
    booking_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(
                fields=['desk', 'booking_date', 'status'],
                name='booking_desk_date_status_idx',
            ),
        ]
        ordering = ['-booking_date', '-created_at']

    def __str__(self):
        return (
            f'Booking {self.id} - {self.user_id} - '
            f'{self.resource_type} on {self.booking_date}'
        )
