# Task Context: Room Booking Backend Feature

## Ticket Scope

Extend the `bookings` Django app with room reservation support, PostgreSQL overlap constraints, transactional services, REST API endpoints, availability integration, and tests.

### In scope (this change)
- `Booking` model refactor: UUID primary key, generic `resource_id`, `date` + `start_at`/`end_at` time slots
- Desk booking constraints via `UniqueConstraint` (user-per-day and desk-per-day for active bookings)
- Room overlap protection via PostgreSQL `ExclusionConstraint` with `btree_gist` extension
- Service layer: `create_room_booking`, `cancel_booking` (plus updated `create_desk_booking`)
- Serializers: `BookingSerializer` (read-only), `CreateBookingSerializer` (desk or room creation)
- `BookingViewSet` extended for room creation and shared cancellation
- Admin registration, `permissions.py` (`IsBookingOwner`), `tasks.py` placeholder
- Room availability computed from active room bookings
- Migration `0003_room_booking_support` with vendor-specific UUID PK swap and PostgreSQL-only exclusion constraint
- Pytest coverage in `test_room_overlap.py` for overlaps, cancellation, and concurrency

### Out of scope
- Check-in workflow (`checked_in_at`, `status=checked_in`)
- Frontend booking UI
- Celery background tasks for bookings

## Key Implementation Decisions

1. **Settings** — Added `django.contrib.postgres` to `DJANGO_APPS` in `backend/src/core/settings/base.py` for `ExclusionConstraint` support. Project uses settings package (`core.settings`), not a flat `settings.py`.
2. **Model** — Replaced desk FK with generic `resource_id` + `resource_type`. Desk bookings use `date` only; room bookings require `start_at`/`end_at` with `date` derived from `start_at.date()`.
3. **UUID PK** — Migration `0003` swaps integer PK to UUID via `SeparateDatabaseAndState` with raw SQL (SQLite table recreation, PostgreSQL column swap).
4. **Overlap detection** — PostgreSQL `ExclusionConstraint` on `(resource_id, tstzrange(start_at, end_at))` for active room bookings. Service-layer interval query provides SQLite test compatibility and fast-fail before insert.
5. **Desk constraints** — Replaced migration `0002` partial unique index with model-level `UniqueConstraint` on `(user, date)` and `(resource_id, date)` for active desk bookings.
6. **API backward compatibility** — `BookingSerializer` still exposes `desk_id` and `booking_date` aliases alongside new fields (`resource_id`, `date`, `start_at`, `end_at`, `room_id`).
7. **Create payload** — Desk: `{desk_id, booking_date}`. Room: `{room_id, start_at, end_at}` (ISO 8601). Mutually exclusive.
8. **Cancellation** — `cancel_booking()` service with row lock; `destroy` action delegates to it (idempotent 204).
9. **Availability** — `get_room_availability()` marks rooms unavailable when an active room booking overlaps the query window.

## Assumptions

- Room bookings use timezone-aware datetimes (UTC in tests); naive datetimes may trigger Django warnings but are not rejected at the serializer layer.
- SQLite test DB does not enforce `ExclusionConstraint`; application-level overlap checks ensure test parity.
- `btree_gist` extension creation runs only on PostgreSQL during migration.
- Existing desk booking API contract (`desk_id`, `booking_date`) is preserved for clients.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/bookings/models.py` | UUID PK, resource_id, time slots, indexes, constraints |
| `backend/src/bookings/services.py` | `create_room_booking`, `cancel_booking`, updated desk service |
| `backend/src/bookings/serializers.py` | `CreateBookingSerializer`, updated `BookingSerializer` |
| `backend/src/bookings/views.py` | Room create path, `cancel_booking` integration |
| `backend/src/bookings/exceptions.py` | Added `RoomAlreadyBooked` |
| `backend/src/bookings/admin.py` | Register `Booking` in admin |
| `backend/src/bookings/permissions.py` | `IsBookingOwner` permission class |
| `backend/src/bookings/tasks.py` | Empty placeholder for future Celery tasks |
| `backend/src/bookings/migrations/0003_room_booking_support.py` | Schema migration with btree_gist and constraints |
| `backend/src/bookings/tests/test_room_overlap.py` | Room overlap, cancel, concurrency tests |
| `backend/src/bookings/tests/test_desk_booking.py` | Updated assertions for `resource_id`/`date` |
| `backend/src/core/settings/base.py` | Added `django.contrib.postgres` |
| `backend/src/spaces/services/availability.py` | Room availability from bookings |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/bookings/` | Create desk (`desk_id`, `booking_date`) or room (`room_id`, `start_at`, `end_at`) booking |
| GET | `/api/v1/bookings/` | List current user's bookings (paginated) |
| GET | `/api/v1/bookings/{uuid}/` | Retrieve own booking |
| DELETE | `/api/v1/bookings/{uuid}/` | Cancel booking (sets `status=cancelled`) |

All require `Authorization: Bearer <access_token>`.

## Open Questions / Follow-ups

- Check-in endpoint to set `checked_in_at` and `status=checked_in`
- Frontend room booking flow wired to new endpoints
- True PostgreSQL concurrent room booking tests (SQLite used in test settings)
- Shared test fixtures (`conftest.py`) to reduce duplication between desk and room tests

## Verification

```bash
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test python3 manage.py migrate
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/bookings/tests/ -v
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/ -v
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pylint --load-plugins=pylint_django --django-settings-module=core.settings.test src/bookings/ src/core/settings/base.py src/spaces/services/availability.py
```

- Backend: 70 tests passing (31 bookings + 24 spaces + 10 accounts + 5 authentication)
