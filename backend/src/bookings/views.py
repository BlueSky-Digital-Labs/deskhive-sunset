from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from spaces.models import Desk, Room

from .exceptions import CheckInNotAllowed, DeskAlreadyBooked, OnePerDayViolation, RoomAlreadyBooked
from .models import Booking
from .serializers import BookingSerializer, CreateBookingSerializer
from .services import (
    CANCELLABLE_STATUSES,
    cancel_booking,
    check_in_booking,
    create_desk_booking,
    create_room_booking,
    is_booking_upcoming,
)


class BookingCheckInView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist as exc:
            raise NotFound('Booking not found.') from exc

        if booking.user_id != request.user.id:
            raise PermissionDenied('You do not have permission to check in to this booking.')

        try:
            booking = check_in_booking(user=request.user, booking=booking)
        except CheckInNotAllowed as exc:
            raise ValidationError(str(exc)) from exc

        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookingViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BookingSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return (
            Booking.objects.filter(user=self.request.user)
            .select_related('user')
            .order_by('-date', '-created_at')
        )

    def create(self, request, *args, **kwargs):
        serializer = CreateBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        if validated['resource_type'] == Booking.RESOURCE_TYPE_DESK:
            return self._create_desk_booking(request, validated)
        return self._create_room_booking(request, validated)

    def _create_desk_booking(self, request, validated):
        desk_id = validated['desk_id']
        booking_date = validated['booking_date']

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

    def _create_room_booking(self, request, validated):
        room_id = validated['room_id']
        start_at = validated['start_at']
        end_at = validated['end_at']

        if not Room.objects.filter(pk=room_id, is_active=True).exists():
            return Response(
                {'detail': 'Room not found or inactive.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            booking = create_room_booking(
                user=request.user,
                room_id=room_id,
                start_at=start_at,
                end_at=end_at,
            )
        except RoomAlreadyBooked as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except Room.DoesNotExist:
            return Response(
                {'detail': 'Room not found or inactive.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        output = BookingSerializer(booking)
        return Response(output.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        if booking.status == Booking.STATUS_CANCELLED:
            return Response(status=status.HTTP_204_NO_CONTENT)

        cancel_booking(user=request.user, booking=booking)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel an upcoming booking owned by the authenticated user.

        Business rules:
        - Only bookings in a cancellable state (active / pending / confirmed) may
          be cancelled. Checked-in, cancelled, or otherwise terminal bookings are
          rejected with HTTP 400.
        - The booking must still be upcoming: desk bookings on or after today, or
          room bookings whose end time is still in the future.
        - Past or non-cancellable bookings return HTTP 400 with a friendly message.
        - Bookings owned by another user return HTTP 403.
        """
        try:
            booking = Booking.objects.select_related('user').get(pk=pk)
        except Booking.DoesNotExist:
            return Response(
                {'detail': 'Booking not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.user_id != request.user.id:
            return Response(
                {'detail': 'You do not have permission to cancel this booking.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status not in CANCELLABLE_STATUSES:
            return Response(
                {
                    'detail': (
                        'Only pending or confirmed upcoming bookings can be '
                        'cancelled.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_booking_upcoming(booking):
            return Response(
                {
                    'detail': (
                        'Only pending or confirmed upcoming bookings can be '
                        'cancelled.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        cancelled = cancel_booking(user=request.user, booking=booking)
        serializer = BookingSerializer(cancelled)
        return Response(serializer.data, status=status.HTTP_200_OK)
