from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from spaces.models import Desk

from .exceptions import DeskAlreadyBooked, OnePerDayViolation
from .models import Booking
from .serializers import BookingCreateSerializer, BookingSerializer
from .services import create_desk_booking


class BookingViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BookingSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return (
            Booking.objects.filter(user=self.request.user)
            .select_related('desk', 'user')
            .order_by('-booking_date', '-created_at')
        )

    def create(self, request, *args, **kwargs):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        desk_id = serializer.validated_data['desk_id']
        booking_date = serializer.validated_data['booking_date']

        if not Desk.objects.filter(pk=desk_id, is_active=True).exists():
            return Response(
                {'detail': 'Desk not found or inactive.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            booking = create_desk_booking(
                user=request.user,
                desk_id=desk_id,
                booking_date=booking_date,
            )
        except OnePerDayViolation as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except DeskAlreadyBooked as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except Desk.DoesNotExist:
            return Response(
                {'detail': 'Desk not found or inactive.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output = BookingSerializer(booking)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        booking = get_object_or_404(
            Booking,
            pk=kwargs['pk'],
            user=request.user,
        )
        if booking.status == Booking.STATUS_CANCELLED:
            return Response(status=status.HTTP_204_NO_CONTENT)

        booking.status = Booking.STATUS_CANCELLED
        booking.save(update_fields=['status'])
        return Response(status=status.HTTP_204_NO_CONTENT)
