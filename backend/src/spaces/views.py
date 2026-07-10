from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import Desk, Floor, Room
from .serializers import DeskSerializer, FloorSerializer, RoomSerializer


class FloorViewSet(ModelViewSet):
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer
    permission_classes = [IsAuthenticated]


class DeskViewSet(ModelViewSet):
    queryset = Desk.objects.select_related('floor').all()
    serializer_class = DeskSerializer
    permission_classes = [IsAuthenticated]


class RoomViewSet(ModelViewSet):
    queryset = Room.objects.select_related('floor').all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]
