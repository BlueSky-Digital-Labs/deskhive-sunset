from rest_framework import serializers

from .models import Booking


class BookingCreateSerializer(serializers.Serializer):
    desk_id = serializers.IntegerField()
    booking_date = serializers.DateField()


class BookingSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    desk_id = serializers.IntegerField(source='desk.id', read_only=True, allow_null=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'user_id',
            'resource_type',
            'desk_id',
            'booking_date',
            'status',
            'created_at',
            'checked_in_at',
        ]
        read_only_fields = fields
