# Task Context: DeskHive Sunset — Spaces Backend API

## Ticket Scope

Implement the `spaces` Django app with Floor, Desk, and Room models, CRUD REST endpoints, and stubbed availability endpoints secured by JWT authentication.

### In scope (this change)
- New `spaces` app at `backend/src/spaces/`
- Models: `Floor`, `Desk`, `Room` with constraints and indexes
- DRF ModelViewSets for CRUD at `/api/v1/floors/`, `/api/v1/desks/`, `/api/v1/rooms/`
- Availability stubs at `/api/v1/availability/desks/` and `/api/v1/availability/rooms/`
- Pytest coverage for CRUD and availability (valid/invalid/unauthenticated cases)

### Out of scope
- Real booking/reservation logic (availability returns `available=true` for all active resources)
- Frontend changes
- Docker configuration changes

## Key Implementation Decisions

1. **App registration** — `spaces` added to `LOCAL_APPS` in `core.settings.base` (project uses split settings package, not a single `settings.py`).
2. **Floor uniqueness** — `UniqueConstraint` on `(building, level, name)`; `level` is `CharField` to support labels like `"3"` or `"Ground"`.
3. **Desk/Room indexes** — `Index(fields=['floor', 'is_active'])` on both models for availability query performance.
4. **Availability service** — `spaces/services/availability.py` filters active desks/rooms and returns placeholder `available: true` until booking dependencies exist.
5. **Serializer validation** — `UniqueTogetherValidator` on Floor, Desk, and Room serializers so duplicate creates return HTTP 400 instead of DB integrity errors.
6. **Authentication** — All spaces endpoints use `IsAuthenticated`; JWT via existing SimpleJWT setup.
7. **URL layout** — Single `path('api/v1/', include('spaces.urls'))` mounts router + availability views under `/api/v1/`.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/spaces/` | New app: models, serializers, views, availability service, URLs, migrations, tests |
| `backend/src/core/settings/base.py` | Register `spaces` in `INSTALLED_APPS` |
| `backend/src/core/urls.py` | Mount spaces routes under `/api/v1/` |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/v1/floors/` | List/create floors |
| GET/PATCH/PUT/DELETE | `/api/v1/floors/{id}/` | Retrieve/update/delete floor |
| GET/POST | `/api/v1/desks/` | List/create desks |
| GET/PATCH/PUT/DELETE | `/api/v1/desks/{id}/` | Retrieve/update/delete desk |
| GET/POST | `/api/v1/rooms/` | List/create rooms |
| GET/PATCH/PUT/DELETE | `/api/v1/rooms/{id}/` | Retrieve/update/delete room |
| GET | `/api/v1/availability/desks/?date=YYYY-MM-DD` | Desk availability (stub) |
| GET | `/api/v1/availability/rooms/?start=ISO&end=ISO` | Room availability (stub) |

All endpoints require `Authorization: Bearer <access_token>`.

## Assumptions and Edge Cases

- Availability excludes inactive desks/rooms but does not check bookings yet.
- Room availability requires `start < end`; equal timestamps return HTTP 400.
- ISO datetimes accept `Z` suffix (normalized to `+00:00` before parsing).
- Paginated list responses use DRF default page size (20).
- Deleting a floor cascades to its desks and rooms.

## Open Questions / Follow-ups

- Integrate booking/reservation models to compute real availability.
- Add filtering (by floor, building) on list endpoints if needed by frontend.
- Register spaces models in Django admin if operational tooling is required.

## Verification

```bash
cd backend
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test python3 manage.py migrate
PYTHONPATH=src python3 -m pytest src/spaces/tests/test_spaces_api.py src/accounts/tests/test_auth.py -v
```

All 34 backend tests pass (24 spaces + 10 accounts). No backend linter configuration found in repo.
