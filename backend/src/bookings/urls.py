from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BookingViewSet
from .views_my import MyBookingsListView

router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('my/bookings', MyBookingsListView.as_view(), name='my-bookings'),
] + router.urls
