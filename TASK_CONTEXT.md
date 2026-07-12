# Task Context: Unified My Bookings API

## Ticket Scope

Backend feature for authenticated users to list their own bookings (upcoming and past) via a dedicated endpoint, with serializer enhancements and stricter cancel validation.

### In scope (this change)
- Extend `BookingSerializer` with `resource_label` (placeholder) and `is_upcoming`; remove `checked_in_at` from list payload
- New `GET /api/v1/my/bookings` endpoint with `bucket` (`upcoming`|`past`) and optional `resource_type` (`desk`|`room`) filters
- Paginated list (page size 20) scoped to `request.user`
- `POST /api/v1/bookings/{id}/cancel/` action with time/status validation and friendly errors
- Tests in `backend/src/bookings/tests/test_my_bookings.py`

### Out of scope
- Populating `resource_label` from desk/room names (left as `null` placeholder)
- Frontend changes to consume `my/bookings` (existing client still uses `GET /api/v1/bookings/`)
- Check-in workflow

## Key Implementation Decisions

1. **Bucket boundaries**
   - `upcoming`: desk `date >= today`; room `end_at > now` (includes in-progress room bookings)
   - `past`: desk `date < today`; room `end_at <= now`
2. **`is_upcoming` serializer field** (stricter than bucket): desk `date > today`; room `start_at > now`
3. **Ordering**: upcoming ascending (`date`, `start_at`); past descending; default (no bucket) reverse chronological
4. **Cancel eligibility**: status in `active` or `checked_in`; desk date must be today or later; room `start_at` must be in the future. Maps task wording of pending/confirmed to existing `active`/`checked_in` statuses.
5. **Cancel endpoints**: new `POST .../cancel/` action; `DELETE .../` retained with the same validation for backward compatibility
6. **Invalid `bucket`**: returns 400 with a clear message

## Files Changed

| File | Why |
|------|-----|
| `backend/src/bookings/serializers.py` | Added `resource_label`, `is_upcoming`; removed `checked_in_at` |
| `backend/src/bookings/views_my.py` | New `MyBookingsListView` with bucket/resource filters and pagination |
| `backend/src/bookings/views.py` | Cancel action + shared validation helper; updated `destroy` |
| `backend/src/bookings/urls.py` | Registered `my/bookings` route |
| `backend/src/bookings/tests/test_my_bookings.py` | List, bucket, pagination, ordering, cancel success/error coverage |

## API Endpoints

| Method | Path | Query / notes |
|--------|------|---------------|
| GET | `/api/v1/my/bookings` | `?bucket=upcoming\|past`, `?resource_type=desk\|room`, `?page=` |
| POST | `/api/v1/bookings/{uuid}/cancel/` | Cancel upcoming owned booking |
| DELETE | `/api/v1/bookings/{uuid}/` | Same cancel rules as above (legacy) |

## Open Questions / Follow-ups

- Resolve `resource_label` from `Desk`/`Room` names via select/prefetch
- Point frontend `getBookings` at `/api/v1/my/bookings` with bucket support
- Align `is_upcoming` desk logic with bucket (`>= today` vs `> today`) if product wants consistency at day boundary

## Verification

```bash
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test python3 manage.py migrate
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/ -v
```

- Backend: 85 tests passing (15 new in `test_my_bookings.py`)
