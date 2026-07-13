from datetime import datetime

from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.utilisation import build_utilisation_report


class UtilisationView(APIView):
    """
    Admin utilisation dashboard for desk and room bookings.

    Query parameters:
    - ``start_date`` (required): inclusive range start (YYYY-MM-DD)
    - ``end_date`` (required): inclusive range end (YYYY-MM-DD)
    - ``floor_id`` (optional): limit metrics to a single floor
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        start_param = request.query_params.get('start_date')
        end_param = request.query_params.get('end_date')
        floor_id = request.query_params.get('floor_id')

        if not start_param or not end_param:
            return Response(
                {
                    'detail': (
                        'start_date and end_date query parameters are required '
                        '(YYYY-MM-DD).'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = datetime.strptime(start_param, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_param, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_date > end_date:
            return Response(
                {'detail': 'start_date must be on or before end_date.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if floor_id is not None and floor_id != '':
            try:
                int(floor_id)
            except ValueError:
                return Response(
                    {'detail': 'floor_id must be an integer.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        report = build_utilisation_report(start_date, end_date, floor_id)
        return Response(report)
