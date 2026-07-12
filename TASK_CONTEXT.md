# Task Context: My Bookings API (Backend)

## Ticket Scope

Implement user-specific bookings listing at `/api/v1/my/bookings` and tighten cancellation rules for upcoming bookings.

### In scope (this change)
- Extend `BookingSerializer` with `resource_label` (placeholder) and `is_upcoming`
- `MyBookingsListView` with `bucket` (`upcoming`|`past`), optional `resource_type`, pagination (20), and sort annotation
- `POST /api/v1/bookings/{id}/cancel/` action with upcoming + status validation
- Composite index on `(user, status, date)` for list-query performance
- Unit tests in `test_my_bookings.py`

### Out of scope
- Spaces BE integration for `resource_label`
- Frontend My Bookings page
- New booking status values (`pending`, `released`, `no_show`) — mapped to existing `active` / `checked_in` / `cancelled`

## Key Implementation Decisions

1. **Status mapping** — API/task vocabulary uses `pending`/`confirmed`/`checked_in`; the model uses `active`/`checked_in`/`cancelled`. Upcoming bucket filters `active` + `checked_in`; cancellable bookings are `active` only.
2. **Bucket logic** — Upcoming: `(desk & date >= today | room & end_at >= now) & active statuses`. Past: past time windows OR `cancelled` status.
3. **`is_upcoming` serializer field** — Desks use `date >= today`; rooms use `start_at >= now` (per ticket; bucket filtering uses `end_at` for rooms).
4. **List payload** — `checked_in_at` omitted from My Bookings responses via serializer context flag.
5. **Sorting** — `annotate(sort_at=Case(...))` casts desk `date` to datetime; rooms sort on `start_at`.
6. **Cancel action** — New `POST .../cancel/` returns 200 + booking body; existing `DELETE` cancel remains for backward compatibility. Invalid state → 400; other user → 403.
7. **Index** — Added `booking_user_status_date_idx` on `(user, status, date)`; exclusion constraint unchanged (still applied via migration 0003 RunPython on PostgreSQL).

## Files Changed

| File | Why |
|------|-----|
| `backend/src/bookings/serializers.py` | `resource_label`, `is_upcoming`, optional `checked_in_at` exclusion |
| `backend/src/bookings/services.py` | Bucket filters, sort annotation, `is_booking_upcoming`, status constants |
| `backend/src/bookings/views_my.py` | `MyBookingsListView` |
| `backend/src/bookings/views.py` | `cancel` action with business-rule docstring |
| `backend/src/bookings/urls.py` | Route `my/bookings` |
| `backend/src/bookings/models.py` | User/status/date index |
| `backend/src/bookings/migrations/0004_add_user_status_date_index.py` | Index migration |
| `backend/src/bookings/tests/test_my_bookings.py` | List, bucket, pagination, cancel tests |

## API Endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/my/bookings/` | `?bucket=upcoming\|past`, `?resource_type=desk\|room`, paginated (20) |
| POST | `/api/v1/bookings/{uuid}/cancel/` | Cancel upcoming active booking (200/400/403) |
| DELETE | `/api/v1/bookings/{uuid}/` | Existing logical cancel (unchanged) |

## Open Questions / Follow-ups

- Populate `resource_label` once Spaces API exposes desk/room display names
- Align room `is_upcoming` with bucket `end_at` semantics if product prefers consistency
- Frontend consumption of `/api/v1/my/bookings` and `POST .../cancel/`

## Verification

```bash
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test python3 manage.py migrate
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/bookings/tests/ -v
```

- Bookings app: 43 tests passing
