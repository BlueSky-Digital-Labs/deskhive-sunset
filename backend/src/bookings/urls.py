from django.urls import path
from rest_framework.routers import DefaultRouter

from .health import AutoReleaseHealthView
from .views import BookingCheckInView, BookingViewSet
from .views_my import MyBookingsListView

router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('my/bookings', MyBookingsListView.as_view(), name='my-bookings'),
    path(
        'bookings/<uuid:pk>/check_in',
        BookingCheckInView.as_view(),
        name='booking-check-in',
    ),
    path(
        'admin/auto_release_health',
        AutoReleaseHealthView.as_view(),
        name='auto-release-health',
    ),
    *router.urls,
]
