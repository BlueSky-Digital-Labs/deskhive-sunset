from datetime import datetime

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.availability import get_desk_availability, get_room_availability


class DesksAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_param = request.query_params.get('date')
        if not date_param:
            return Response(
                {'detail': 'date query parameter is required (YYYY-MM-DD).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        availability = get_desk_availability(target_date)
        return Response(availability)


class RoomsAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_param = request.query_params.get('start')
        end_param = request.query_params.get('end')

        if not start_param or not end_param:
            return Response(
                {'detail': 'start and end query parameters are required (ISO 8601).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start = datetime.fromisoformat(start_param.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_param.replace('Z', '+00:00'))
        except ValueError:
            return Response(
                {'detail': 'Invalid datetime format. Use ISO 8601.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start >= end:
            return Response(
                {'detail': 'start must be before end.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        availability = get_room_availability(start, end)
        return Response(availability)
