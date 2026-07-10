from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DeskViewSet, FloorViewSet, RoomViewSet
from .views_availability import DesksAvailabilityView, RoomsAvailabilityView

router = DefaultRouter()
router.register(r'floors', FloorViewSet, basename='floor')
router.register(r'desks', DeskViewSet, basename='desk')
router.register(r'rooms', RoomViewSet, basename='room')

urlpatterns = [
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
