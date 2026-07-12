from django.db.models import Q
from django.utils import timezone
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Booking
from .serializers import BookingSerializer


class MyBookingsPagination(PageNumberPagination):
    page_size = 20


class MyBookingsListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = BookingSerializer
    pagination_class = MyBookingsPagination

    def get_queryset(self):
        queryset = (
            Booking.objects.filter(user=self.request.user)
            .select_related('user')
        )

        resource_type = self.request.query_params.get('resource_type')
        if resource_type in (
            Booking.RESOURCE_TYPE_DESK,
            Booking.RESOURCE_TYPE_ROOM,
        ):
            queryset = queryset.filter(resource_type=resource_type)

        bucket = self.request.query_params.get('bucket')
        now = timezone.now()
        today = timezone.localdate()

        if bucket == 'upcoming':
            queryset = queryset.filter(
                Q(resource_type=Booking.RESOURCE_TYPE_DESK, date__gte=today)
                | Q(
                    resource_type=Booking.RESOURCE_TYPE_ROOM,
                    end_at__gt=now,
                )
            )
            return queryset.order_by('date', 'start_at', 'created_at')

        if bucket == 'past':
            queryset = queryset.filter(
                Q(resource_type=Booking.RESOURCE_TYPE_DESK, date__lt=today)
                | Q(
                    resource_type=Booking.RESOURCE_TYPE_ROOM,
                    end_at__lte=now,
                )
            )
            return queryset.order_by('-date', '-start_at', '-created_at')

        if bucket is not None:
            return queryset.none()

        return queryset.order_by('-date', '-start_at', '-created_at')

    def list(self, request, *args, **kwargs):
        bucket = request.query_params.get('bucket')
        if bucket is not None and bucket not in ('upcoming', 'past'):
            return Response(
                {'detail': 'bucket must be either "upcoming" or "past".'},
                status=400,
            )
        return super().list(request, *args, **kwargs)
