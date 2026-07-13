from django.core.cache import cache
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import LAST_AUTO_RELEASE_CACHE_KEY


class AutoReleaseHealthView(APIView):
    """Health probe exposing the last auto-release task run timestamp."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        last_run_at = cache.get(LAST_AUTO_RELEASE_CACHE_KEY)
        return Response(
            {
                'status': 'ok',
                'last_auto_release_run_at': last_run_at,
            }
        )
