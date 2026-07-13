from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminDeskViewSet,
    AdminFloorViewSet,
    AdminRoomViewSet,
    DeskViewSet,
    FloorViewSet,
    RoomViewSet,
)
from .views_availability import DesksAvailabilityView, RoomsAvailabilityView

router = DefaultRouter()
router.register(r'floors', FloorViewSet, basename='floor')
router.register(r'desks', DeskViewSet, basename='desk')
router.register(r'rooms', RoomViewSet, basename='room')

admin_router = DefaultRouter()
admin_router.register(r'floors', AdminFloorViewSet, basename='admin-floor')
admin_router.register(r'desks', AdminDeskViewSet, basename='admin-desk')
admin_router.register(r'rooms', AdminRoomViewSet, basename='admin-room')

urlpatterns = [
    path('admin/', include(admin_router.urls)),
    path(
        'availability/desks/',
        DesksAvailabilityView.as_view(),
        name='desks-availability',
    ),
    path(
        'availability/rooms/',
        RoomsAvailabilityView.as_view(),
        name='rooms-availability',
    ),
    *router.urls,
]
