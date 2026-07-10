from django.urls import path
from rest_framework.routers import DefaultRouter

from .health import AutoReleaseHealthView
from .views import BookingCheckInView, BookingViewSet

router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path(
        'bookings/<uuid:pk>/check-in/',
        BookingCheckInView.as_view(),
        name='booking-check-in',
    ),
    path(
        'bookings/health/auto-release/',
        AutoReleaseHealthView.as_view(),
        name='booking-auto-release-health',
    ),
    *router.urls,
]
