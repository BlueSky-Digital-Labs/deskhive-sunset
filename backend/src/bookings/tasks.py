"""
Celery tasks for the bookings app.
"""

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task
def auto_release_no_shows():
    """
    Periodic task that cancels unchecked bookings past their cutoff.
    """
    from .services import release_no_show_bookings

    result = release_no_show_bookings()
    logger.info('Auto-release no-shows completed: %s', result)
    return result
