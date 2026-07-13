# Task Context: Admin Spaces CRUD and Utilisation Summary

## Ticket Scope

Backend-only admin APIs for managing spaces (floors, desks, rooms) and reporting desk/room utilisation from booking data.

### In scope
- Admin CRUD viewsets for `Floor`, `Desk`, and `Room` under `/api/v1/admin/`
- `IsAdminUser` permission on all admin spaces endpoints
- Optional `?is_active=true|false` filtering (inactive records included by default)
- `GET /api/v1/admin/utilisation` with `start_date`, `end_date`, optional `floor_id`
- Tests for admin CRUD access control and utilisation aggregation
- `backend/README.md` documentation for new endpoints

### Out of scope
- Frontend admin UI
- Changes to public `/api/v1/floors|desks|rooms/` endpoints (remain `IsAuthenticated`)
- django-filter dependency (manual query-param filtering used instead)

## Key Implementation Decisions

1. **Separate admin viewsets** — Existing public `FloorViewSet` / `DeskViewSet` / `RoomViewSet` kept at `/api/v1/` for backward compatibility. New `Admin*` viewsets registered under `/api/v1/admin/` with `IsAdminUser`.
2. **`admin_api` app** — Utilisation reporting lives in a dedicated app (`admin_api`) to keep bookings health and spaces CRUD concerns separated.
3. **Utilisation metrics** — Count bookings with status `active`, `checked_in`, or `released`; exclude `cancelled`. Utilisation rate = `bookings_count / (resource_count * days_in_range)` for summary, and `bookings_count / resource_count` per day.
4. **Resource scope** — Only active desks/rooms count toward capacity. Optional `floor_id` limits both capacity and booking filters to one floor.
5. **Models** — `is_active` already present on `Floor`, `Desk`, and `Room`; no migration required.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/spaces/views.py` | Added `AdminFloorViewSet`, `AdminDeskViewSet`, `AdminRoomViewSet` with `IsActiveFilterMixin` |
| `backend/src/spaces/urls.py` | Registered admin router at `admin/` |
| `backend/src/admin_api/apps.py` | New app config |
| `backend/src/admin_api/views.py` | `UtilisationView` API |
| `backend/src/admin_api/services/utilisation.py` | Booking aggregation logic |
| `backend/src/admin_api/urls.py` | `admin/utilisation` route |
| `backend/src/core/settings/base.py` | Registered `admin_api` app |
| `backend/src/core/urls.py` | Included `admin_api` URLs under `/api/v1/` |
| `backend/src/spaces/tests/test_admin_crud.py` | Admin CRUD and permission tests |
| `backend/src/admin_api/tests/test_utilisation.py` | Utilisation summary and daily metrics tests |
| `backend/README.md` | Admin endpoint and utilisation documentation |

## API Endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/v1/admin/floors/` | Admin floor list/create |
| GET/PATCH/PUT/DELETE | `/api/v1/admin/floors/{id}/` | Admin floor detail |
| GET/POST | `/api/v1/admin/desks/` | Admin desk list/create |
| GET/PATCH/PUT/DELETE | `/api/v1/admin/desks/{id}/` | Admin desk detail |
| GET/POST | `/api/v1/admin/rooms/` | Admin room list/create |
| GET/PATCH/PUT/DELETE | `/api/v1/admin/rooms/{id}/` | Admin room detail |
| GET | `/api/v1/admin/utilisation` | Utilisation dashboard (`start_date`, `end_date`, optional `floor_id`) |

## Open Questions / Follow-ups

- Whether room utilisation should use time-weighted occupancy instead of booking counts
- Moving auto-release health from `bookings` to `admin_api` for consistency
- OpenAPI tags for admin endpoints in drf-spectacular

## Verification

```bash
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/spaces/tests/ src/admin_api/tests/ -v
```
