from django.utils import timezone
from rest_framework import serializers

from .models import Booking


class CreateBookingSerializer(serializers.Serializer):
    desk_id = serializers.IntegerField(required=False)
    booking_date = serializers.DateField(required=False)
    room_id = serializers.IntegerField(required=False)
    start_at = serializers.DateTimeField(required=False)
    end_at = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        desk_id = attrs.get('desk_id')
        room_id = attrs.get('room_id')

        if desk_id is not None and room_id is not None:
            raise serializers.ValidationError(
                'Provide either desk_id or room_id, not both.'
            )

        if desk_id is not None:
            if attrs.get('booking_date') is None:
                raise serializers.ValidationError(
                    {'booking_date': 'This field is required for desk bookings.'}
                )
            attrs['resource_type'] = Booking.RESOURCE_TYPE_DESK
            return attrs

        if room_id is not None:
            start_at = attrs.get('start_at')
            end_at = attrs.get('end_at')
            if start_at is None:
                raise serializers.ValidationError(
                    {'start_at': 'This field is required for room bookings.'}
                )
            if end_at is None:
                raise serializers.ValidationError(
                    {'end_at': 'This field is required for room bookings.'}
                )
            if start_at >= end_at:
                raise serializers.ValidationError(
                    {'end_at': 'end_at must be after start_at.'}
                )
            attrs['resource_type'] = Booking.RESOURCE_TYPE_ROOM
            return attrs

        raise serializers.ValidationError(
            'Either desk_id or room_id is required.'
        )


class BookingSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    desk_id = serializers.SerializerMethodField()
    room_id = serializers.SerializerMethodField()
    booking_date = serializers.DateField(source='date', read_only=True)
    # Placeholder until Spaces BE exposes human-readable desk/room labels.
    resource_label = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id',
            'user_id',
            'resource_type',
            'resource_id',
            'resource_label',
            'desk_id',
            'room_id',
            'booking_date',
            'date',
            'start_at',
            'end_at',
            'status',
            'is_upcoming',
            'created_at',
            'checked_in_at',
        ]
        read_only_fields = fields

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.context.get('exclude_checked_in_at'):
            self.fields.pop('checked_in_at', None)

    def get_resource_label(self, obj):
        # Pending Spaces BE integration for desk/room display names.
        return None

    def get_is_upcoming(self, obj):
        today = timezone.localdate()
        now = timezone.now()
        if obj.resource_type == Booking.RESOURCE_TYPE_DESK:
            return obj.date >= today
        if obj.resource_type == Booking.RESOURCE_TYPE_ROOM:
            return obj.start_at is not None and obj.start_at >= now
        return False

    def get_desk_id(self, obj):
        if obj.resource_type == Booking.RESOURCE_TYPE_DESK:
            return obj.resource_id
        return None

    def get_room_id(self, obj):
        if obj.resource_type == Booking.RESOURCE_TYPE_ROOM:
            return obj.resource_id
        return None
