from rest_framework import serializers

from .models import Desk, Floor, Room


class FloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        fields = ['id', 'name', 'building', 'level', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=Floor.objects.all(),
                fields=['building', 'level', 'name'],
            ),
        ]


class DeskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Desk
        fields = ['id', 'name', 'floor', 'is_active']
        read_only_fields = ['id']
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=Desk.objects.all(),
                fields=['floor', 'name'],
            ),
        ]


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'floor', 'capacity', 'is_active']
        read_only_fields = ['id']
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=Room.objects.all(),
                fields=['floor', 'name'],
            ),
        ]
