from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_room_booking_support'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(
                fields=['user', 'status', 'date'],
                name='booking_user_status_date_idx',
            ),
        ),
    ]
