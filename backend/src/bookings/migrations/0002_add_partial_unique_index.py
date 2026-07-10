from django.db import migrations


CREATE_PARTIAL_UNIQUE_INDEX_POSTGRES = """
    CREATE UNIQUE INDEX CONCURRENTLY booking_user_date_desk_partial_uniq
    ON bookings_booking (user_id, booking_date)
    WHERE resource_type = 'desk'
      AND status IN ('active', 'checked_in');
"""

CREATE_PARTIAL_UNIQUE_INDEX_SQLITE = """
    CREATE UNIQUE INDEX booking_user_date_desk_partial_uniq
    ON bookings_booking (user_id, booking_date)
    WHERE resource_type = 'desk'
      AND status IN ('active', 'checked_in');
"""

DROP_PARTIAL_UNIQUE_INDEX = """
    DROP INDEX IF EXISTS booking_user_date_desk_partial_uniq;
"""


def create_partial_unique_index(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(CREATE_PARTIAL_UNIQUE_INDEX_POSTGRES)
    else:
        schema_editor.execute(CREATE_PARTIAL_UNIQUE_INDEX_SQLITE)


def drop_partial_unique_index(apps, schema_editor):
    schema_editor.execute(DROP_PARTIAL_UNIQUE_INDEX)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('bookings', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            create_partial_unique_index,
            drop_partial_unique_index,
        ),
    ]
