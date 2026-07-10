from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class AutoReleaseHealthView(APIView):
    """Health probe for auto-release no-show job configuration."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                'status': 'ok',
                'auto_release_enabled': settings.BOOKING_AUTO_RELEASE_ENABLED,
                'grace_minutes': settings.BOOKING_AUTO_RELEASE_GRACE_MINUTES,
                'desk_check_in_deadline_time': (
                    settings.BOOKING_DESK_CHECK_IN_DEADLINE_TIME
                ),
                'check_in_early_minutes': (
                    settings.BOOKING_CHECK_IN_EARLY_MINUTES
                ),
                'beat_interval_seconds': (
                    settings.BOOKING_AUTO_RELEASE_BEAT_INTERVAL_SECONDS
                ),
            }
        )
