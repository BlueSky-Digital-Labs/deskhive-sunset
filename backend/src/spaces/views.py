from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import Desk, Floor, Room
from .serializers import DeskSerializer, FloorSerializer, RoomSerializer


class IsActiveFilterMixin:
    """Filter queryset by optional ``is_active`` query parameter."""

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is None:
            return queryset
        if is_active.lower() in ('true', '1'):
            return queryset.filter(is_active=True)
        if is_active.lower() in ('false', '0'):
            return queryset.filter(is_active=False)
        return queryset


class FloorViewSet(ModelViewSet):
    """Authenticated CRUD for floors (public spaces API)."""

    queryset = Floor.objects.all()
    serializer_class = FloorSerializer
    permission_classes = [IsAuthenticated]


class DeskViewSet(ModelViewSet):
    """Authenticated CRUD for desks (public spaces API)."""

    queryset = Desk.objects.select_related('floor').all()
    serializer_class = DeskSerializer
    permission_classes = [IsAuthenticated]


class RoomViewSet(ModelViewSet):
    """Authenticated CRUD for rooms (public spaces API)."""

    queryset = Room.objects.select_related('floor').all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]


class AdminFloorViewSet(IsActiveFilterMixin, ModelViewSet):
    """
    Admin CRUD for floors.

    Supports optional ``?is_active=true|false`` filtering. Inactive floors are
    included by default.
    """

    queryset = Floor.objects.all()
    serializer_class = FloorSerializer
    permission_classes = [IsAdminUser]


class AdminDeskViewSet(IsActiveFilterMixin, ModelViewSet):
    """
    Admin CRUD for desks.

    Supports optional ``?is_active=true|false`` filtering. Inactive desks are
    included by default.
    """

    queryset = Desk.objects.select_related('floor').all()
    serializer_class = DeskSerializer
    permission_classes = [IsAdminUser]


class AdminRoomViewSet(IsActiveFilterMixin, ModelViewSet):
    """
    Admin CRUD for rooms.

    Supports optional ``?is_active=true|false`` filtering. Inactive rooms are
    included by default.
    """

    queryset = Room.objects.select_related('floor').all()
    serializer_class = RoomSerializer
    permission_classes = [IsAdminUser]
