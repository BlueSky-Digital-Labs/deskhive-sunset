import uuid

from django.conf import settings
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import RangeOperators
from django.db import models
from django.db.models import F, Func, Q


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
    STATUS_RELEASED = 'released'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_CHECKED_IN, 'Checked in'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_RELEASED, 'Released'),
    ]

    ACTIVE_STATUSES = (STATUS_ACTIVE, STATUS_CHECKED_IN)

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings',
        db_index=True,
    )
    resource_type = models.CharField(
        max_length=10,
        choices=RESOURCE_TYPE_CHOICES,
        db_index=True,
    )
    resource_id = models.PositiveIntegerField(db_index=True)
    date = models.DateField(db_index=True)
    start_at = models.DateTimeField(null=True, blank=True, db_index=True)
    end_at = models.DateTimeField(null=True, blank=True, db_index=True)
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
                fields=['resource_type', 'resource_id', 'date'],
                name='booking_resource_date_idx',
            ),
            models.Index(
                fields=['resource_type', 'resource_id', 'start_at', 'end_at'],
                name='booking_resource_time_idx',
            ),
            models.Index(
                fields=['user', 'status', 'date'],
                name='booking_user_status_date_idx',
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date'],
                condition=Q(resource_type='desk')
                & Q(status__in=['active', 'checked_in']),
                name='unique_active_desk_booking_per_user_date',
            ),
            models.UniqueConstraint(
                fields=['resource_id', 'date'],
                condition=Q(resource_type='desk')
                & Q(status__in=['active', 'checked_in']),
                name='unique_active_desk_resource_per_date',
            ),
            ExclusionConstraint(
                name='exclude_overlapping_room_bookings',
                expressions=[
                    (F('resource_id'), RangeOperators.EQUAL),
                    (
                        Func(F('start_at'), F('end_at'), function='TSTZRANGE'),
                        RangeOperators.OVERLAPS,
                    ),
                ],
                condition=Q(resource_type='room')
                & Q(status__in=['active', 'checked_in']),
            ),
        ]
        ordering = ['-date', '-created_at']

    def __str__(self):
        return (
            f'Booking {self.id} - {self.user_id} - '
            f'{self.resource_type}:{self.resource_id} on {self.date}'
        )
