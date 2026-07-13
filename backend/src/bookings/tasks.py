"""
Celery tasks for the bookings app.
"""

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task(name='auto_release_no_shows')
def auto_release_no_shows():
    """
    Periodic task that releases unchecked bookings past their cutoff.
    """
    from django.conf import settings

    from .services import auto_release_no_show_bookings

    if not settings.AUTO_RELEASE_ENABLED:
        logger.info('Auto-release no-shows skipped: feature disabled')
        return {'released': 0, 'enabled': False, 'skipped': True}

    result = auto_release_no_show_bookings()
    logger.info('Auto-release no-shows completed: %s', result)
    return result
