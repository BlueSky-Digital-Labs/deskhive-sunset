import uuid

from django.db import migrations, models


DROP_PARTIAL_UNIQUE_INDEX = """
    DROP INDEX IF EXISTS booking_user_date_desk_partial_uniq;
"""

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


def drop_partial_unique_index(apps, schema_editor):
    schema_editor.execute(DROP_PARTIAL_UNIQUE_INDEX)


def recreate_partial_unique_index(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(CREATE_PARTIAL_UNIQUE_INDEX_POSTGRES)
    else:
        schema_editor.execute(CREATE_PARTIAL_UNIQUE_INDEX_SQLITE)


def populate_resource_fields(apps, schema_editor):
    Booking = apps.get_model('bookings', 'Booking')
    for booking in Booking.objects.order_by('id').iterator():
        if booking.desk_id:
            booking.resource_id = booking.desk_id
        if not booking.uuid:
            booking.uuid = uuid.uuid4()
        booking.save(update_fields=['resource_id', 'uuid'])


def clear_resource_fields(apps, schema_editor):
    Booking = apps.get_model('bookings', 'Booking')
    Booking.objects.update(resource_id=None, uuid=None)


def swap_primary_key_to_uuid(apps, schema_editor):
    vendor = schema_editor.connection.vendor
    if vendor == 'postgresql':
        schema_editor.execute(
            'ALTER TABLE bookings_booking DROP CONSTRAINT bookings_booking_pkey;'
        )
        schema_editor.execute('ALTER TABLE bookings_booking DROP COLUMN id;')
        schema_editor.execute('ALTER TABLE bookings_booking RENAME COLUMN uuid TO id;')
        schema_editor.execute('ALTER TABLE bookings_booking ADD PRIMARY KEY (id);')
        return

    if vendor == 'sqlite':
        schema_editor.execute(
            """
            CREATE TABLE "bookings_booking_new" (
                "id" char(32) NOT NULL PRIMARY KEY,
                "resource_type" varchar(10) NOT NULL,
                "date" date NOT NULL,
                "status" varchar(20) NOT NULL,
                "created_at" datetime NOT NULL,
                "checked_in_at" datetime NULL,
                "user_id" bigint NOT NULL REFERENCES "auth_user" ("id")
                    DEFERRABLE INITIALLY DEFERRED,
                "resource_id" integer unsigned NOT NULL CHECK ("resource_id" >= 0),
                "start_at" datetime NULL,
                "end_at" datetime NULL
            );
            """
        )
        schema_editor.execute(
            """
            INSERT INTO "bookings_booking_new" (
                "id",
                "resource_type",
                "date",
                "status",
                "created_at",
                "checked_in_at",
                "user_id",
                "resource_id",
                "start_at",
                "end_at"
            )
            SELECT
                "uuid",
                "resource_type",
                "date",
                "status",
                "created_at",
                "checked_in_at",
                "user_id",
                "resource_id",
                "start_at",
                "end_at"
            FROM "bookings_booking";
            """
        )
        schema_editor.execute('DROP TABLE "bookings_booking";')
        schema_editor.execute(
            'ALTER TABLE "bookings_booking_new" RENAME TO "bookings_booking";'
        )
        schema_editor.execute(
            'CREATE INDEX "bookings_booking_user_id_6a6e33dc" '
            'ON "bookings_booking" ("user_id");'
        )
        schema_editor.execute(
            'CREATE INDEX "bookings_booking_resource_id_8f0d8f4d" '
            'ON "bookings_booking" ("resource_id");'
        )
        schema_editor.execute(
            'CREATE INDEX "bookings_booking_date_760f66cf" '
            'ON "bookings_booking" ("date");'
        )
        schema_editor.execute(
            'CREATE INDEX "bookings_booking_start_at_0e8f0f0a" '
            'ON "bookings_booking" ("start_at");'
        )
        schema_editor.execute(
            'CREATE INDEX "bookings_booking_end_at_1f9a1b2c" '
            'ON "bookings_booking" ("end_at");'
        )
        schema_editor.execute(
            'CREATE INDEX "bookings_booking_status_51373bc2" '
            'ON "bookings_booking" ("status");'
        )
        schema_editor.execute(
            'CREATE INDEX "bookings_booking_resource_type_2b8f0f0a" '
            'ON "bookings_booking" ("resource_type");'
        )


def restore_integer_primary_key(apps, schema_editor):
    # Reverse migration is not supported for the UUID primary-key swap.
    pass


def enable_btree_gist(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('CREATE EXTENSION IF NOT EXISTS btree_gist;')


def disable_btree_gist(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('DROP EXTENSION IF EXISTS btree_gist;')


def add_room_exclusion_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute(
        """
        ALTER TABLE bookings_booking
        ADD CONSTRAINT exclude_overlapping_room_bookings
        EXCLUDE USING gist (
            resource_id WITH =,
            tstzrange(start_at, end_at) WITH &&
        )
        WHERE (
            resource_type = 'room'
            AND status IN ('active', 'checked_in')
        );
        """
    )


def drop_room_exclusion_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute(
        'ALTER TABLE bookings_booking '
        'DROP CONSTRAINT IF EXISTS exclude_overlapping_room_bookings;'
    )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('bookings', '0002_add_partial_unique_index'),
    ]

    operations = [
        migrations.RunPython(
            drop_partial_unique_index,
            recreate_partial_unique_index,
        ),
        migrations.RenameField(
            model_name='booking',
            old_name='booking_date',
            new_name='date',
        ),
        migrations.AlterModelOptions(
            name='booking',
            options={'ordering': ['-date', '-created_at']},
        ),
        migrations.RemoveIndex(
            model_name='booking',
            name='booking_desk_date_status_idx',
        ),
        migrations.AddField(
            model_name='booking',
            name='resource_id',
            field=models.PositiveIntegerField(db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='start_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='end_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.RunPython(
            populate_resource_fields,
            clear_resource_fields,
        ),
        migrations.RemoveField(
            model_name='booking',
            name='desk',
        ),
        migrations.AlterField(
            model_name='booking',
            name='resource_id',
            field=models.PositiveIntegerField(db_index=True),
        ),
        migrations.AlterField(
            model_name='booking',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    swap_primary_key_to_uuid,
                    restore_integer_primary_key,
                ),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name='booking',
                    name='id',
                ),
                migrations.RenameField(
                    model_name='booking',
                    old_name='uuid',
                    new_name='id',
                ),
                migrations.AlterField(
                    model_name='booking',
                    name='id',
                    field=models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
            ],
        ),
        migrations.AlterField(
            model_name='booking',
            name='resource_type',
            field=models.CharField(
                choices=[('desk', 'Desk'), ('room', 'Room')],
                db_index=True,
                max_length=10,
            ),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(
                fields=['resource_type', 'resource_id', 'date'],
                name='booking_resource_date_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(
                fields=['resource_type', 'resource_id', 'start_at', 'end_at'],
                name='booking_resource_time_idx',
            ),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ('resource_type', 'desk'),
                    ('status__in', ['active', 'checked_in']),
                ),
                fields=('user', 'date'),
                name='unique_active_desk_booking_per_user_date',
            ),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ('resource_type', 'desk'),
                    ('status__in', ['active', 'checked_in']),
                ),
                fields=('resource_id', 'date'),
                name='unique_active_desk_resource_per_date',
            ),
        ),
        migrations.RunPython(enable_btree_gist, disable_btree_gist),
        migrations.RunPython(
            add_room_exclusion_constraint,
            drop_room_exclusion_constraint,
        ),
    ]
