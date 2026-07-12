from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from .models import Booking
from .serializers import BookingSerializer
from .services import annotate_booking_sort_at, filter_bookings_by_bucket


class MyBookingsPagination(PageNumberPagination):
    page_size = 20


class MyBookingsListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = BookingSerializer
    pagination_class = MyBookingsPagination

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['exclude_checked_in_at'] = True
        return context

    def get_queryset(self):
        queryset = (
            Booking.objects.filter(user=self.request.user)
            .select_related('user')
        )

        bucket = self.request.query_params.get('bucket', 'upcoming')
        if bucket not in ('upcoming', 'past'):
            bucket = 'upcoming'
        queryset = filter_bookings_by_bucket(queryset, bucket)

        resource_type = self.request.query_params.get('resource_type')
        if resource_type in (Booking.RESOURCE_TYPE_DESK, Booking.RESOURCE_TYPE_ROOM):
            queryset = queryset.filter(resource_type=resource_type)

        return annotate_booking_sort_at(queryset).order_by('sort_at')
