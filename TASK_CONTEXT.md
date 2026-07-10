# Task Context: DeskHive Sunset — Bookings Feature (Backend)

## Ticket Scope

Implement a `bookings` Django app for desk reservations with transactional conflict handling, REST API endpoints, availability integration, and tests.

### In scope (this change)
- `bookings` app with `Booking` model (desk bookings v1)
- Service layer with `select_for_update(nowait=True)` desk locking
- `BookingViewSet` — create, list, retrieve, logical cancel (destroy)
- Desk availability computed from active/checked-in bookings
- Migration with partial unique index on `(user, booking_date)` for active desk bookings
- Pytest coverage for creation, conflicts, cancellation, and availability

### Out of scope
- Room booking creation API (model supports `resource_type='room'` for future use)
- Check-in workflow (`checked_in_at` field reserved)
- Frontend booking UI

## Key Implementation Decisions

1. **Settings** — Registered `bookings` in `LOCAL_APPS` via `backend/src/core/settings/base.py` (project uses settings package, not a flat `settings.py`).
2. **Booking statuses** — `active`, `checked_in`, `cancelled`. Destroy sets `cancelled` instead of deleting rows.
3. **Conflict handling** — `OnePerDayViolation` (user already booked a desk that day) and `DeskAlreadyBooked` (desk taken). Both return HTTP 409 from the API.
4. **Transactional guard** — `create_desk_booking()` wraps logic in `transaction.atomic()`, locks the desk row with `select_for_update(nowait=True)`, then checks user and desk conflicts before insert.
5. **Partial unique index** — Added via `RunSQL` in migration `0001_initial` with `atomic = False` (PostgreSQL/SQLite compatible `WHERE` clause).
6. **Composite index** — `Index(fields=['desk', 'booking_date', 'status'])` on the model for availability lookups.
7. **Availability** — `get_desk_availability()` marks desks unavailable when an `active` or `checked_in` desk booking exists for the date.
8. **API routing** — Bookings mounted at `/api/v1/bookings/` alongside spaces routes.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/bookings/apps.py` | `BookingsConfig` with name `bookings` |
| `backend/src/bookings/models.py` | `Booking` model, indexes, status/resource choices |
| `backend/src/bookings/exceptions.py` | `OnePerDayViolation`, `DeskAlreadyBooked` |
| `backend/src/bookings/serializers.py` | `BookingCreateSerializer`, `BookingSerializer` |
| `backend/src/bookings/services.py` | `create_desk_booking()` with row lock and conflict checks |
| `backend/src/bookings/views.py` | `BookingViewSet` (create/list/retrieve/destroy) |
| `backend/src/bookings/urls.py` | Router registration for bookings |
| `backend/src/bookings/migrations/0001_initial.py` | Model migration + `RunSQL` partial unique index |
| `backend/src/bookings/tests/test_desk_booking.py` | Service and API tests |
| `backend/src/core/settings/base.py` | Add `bookings` to `INSTALLED_APPS` |
| `backend/src/core/urls.py` | Include bookings URLs under `/api/v1/` |
| `backend/src/spaces/services/availability.py` | Desk availability from `Booking` records |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/bookings/` | Create desk booking (`desk_id`, `booking_date`) |
| GET | `/api/v1/bookings/` | List current user's bookings (paginated) |
| GET | `/api/v1/bookings/{id}/` | Retrieve own booking |
| DELETE | `/api/v1/bookings/{id}/` | Cancel booking (sets `status=cancelled`) |

All require `Authorization: Bearer <access_token>`.

## Open Questions / Follow-ups

- Room booking service and API endpoints
- Check-in endpoint to set `checked_in_at` and `status=checked_in`
- Frontend booking flow wired to new endpoints
- Concurrent booking race tests under PostgreSQL (SQLite used in test settings)

## Verification

```bash
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test python3 manage.py migrate
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/bookings/tests/ -v
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/ -v
```

- Backend: 53 tests passing (14 bookings + 24 spaces + 10 accounts + 5 authentication)
