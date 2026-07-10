# Task Context: Room Booking (Backend + Frontend)

## Ticket Scope

Full-stack room booking: backend API with overlap constraints and a React frontend for creating, viewing, and cancelling room reservations.

### Backend (completed)
- `bookings` app with UUID `Booking` model, `resource_id`, time slots, desk/room constraints
- `create_room_booking`, `cancel_booking` services; REST API at `/api/v1/bookings/`
- Room availability integration in `spaces/services/availability.py`
- 70 backend tests passing

### Frontend (this change)
- `apiClient.ts` with `postBooking` and `postCancel` (maps to backend `room_id` payload and `DELETE` cancel)
- Redux slices: `roomBookingsSlice`, `roomAvailabilitySlice`
- `/rooms` route with date/time pickers, room list, book/cancel actions
- Vitest coverage for thunks and `RoomsRoute` UI (success, 409 conflict, cancellation)

### Out of scope
- Check-in workflow
- Toast library (inline success/error panels used instead)
- Celery booking tasks

## Key Implementation Decisions

### Backend
1. Settings in `core.settings.base` (not flat `settings.py`); `django.contrib.postgres` for `ExclusionConstraint`
2. Room create payload: `{ room_id, start_at, end_at }` (ISO 8601)
3. Cancel via `DELETE /api/v1/bookings/{uuid}/` (idempotent 204)
4. SQLite tests use service-layer overlap checks; PostgreSQL enforces `ExclusionConstraint` + `btree_gist`

### Frontend
1. **API client** — Task specifies `postBooking({ resource_type, resource_id, start_at, end_at })`; client maps `resource_type: 'room'` to backend `room_id`. `postCancel` uses `DELETE` (backend has no `/cancel` POST endpoint).
2. **Store** — Slices registered in `frontend/src/store/index.ts` (project has no `app/store.ts`).
3. **Availability** — `fetchRooms({ date })` calls `/api/v1/availability/rooms/?start=&end=` derived from date + optional time range; falls back to `GET /api/v1/rooms/` on failure (manual selection).
4. **UI** — Separate date + time inputs combined to ISO strings; success shown as auto-dismissing inline panel (no toast library in project).
5. **409 handling** — Mapped to `lastError: { code, message }` in `roomBookingsSlice`; displayed inline in `RoomsRoute`.
6. **Auth** — `/rooms` guarded via existing `ProtectedRoute` / `selectIsAuthenticated`.

## Assumptions

- Room bookings use timezone-aware ISO datetimes from `new Date(date + time).toISOString()`.
- Backend cancel is `DELETE`, not `POST .../cancel` as in the frontend task template.
- Availability API uses `start`/`end` query params (not `date` alone); frontend derives range from date + times.
- Existing `/spaces/rooms` availability page remains; `/rooms` is the booking workflow.

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/bookings/*` | Model, services, API, migrations, tests |
| `backend/src/core/settings/base.py` | `django.contrib.postgres` |
| `backend/src/spaces/services/availability.py` | Room availability from bookings |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/lib/apiClient.ts` | `postBooking`, `postCancel`, `getBookings` |
| `frontend/src/features/rooms/roomBookingsSlice.ts` | Create/cancel thunks and state |
| `frontend/src/features/rooms/roomAvailabilitySlice.ts` | `fetchRooms` with fallback |
| `frontend/src/routes/rooms/RoomsRoute.tsx` | Booking UI |
| `frontend/src/features/rooms/rooms.css` | Success panel and card actions |
| `frontend/src/store/index.ts` | Register new reducers |
| `frontend/src/App.tsx` | `/rooms` protected route |
| `frontend/src/test/test-utils.tsx` | Test store includes room slices |
| `frontend/src/features/rooms/*.test.ts` | Thunk unit tests |
| `frontend/src/routes/rooms/RoomsRoute.test.tsx` | UI integration tests |

## API Endpoints (used by frontend)

| Method | Path | Body / params |
|--------|------|---------------|
| POST | `/api/v1/bookings/` | `{ room_id, start_at, end_at }` |
| DELETE | `/api/v1/bookings/{uuid}/` | Cancel booking |
| GET | `/api/v1/bookings/` | List user bookings |
| GET | `/api/v1/availability/rooms/` | `?start=&end=` (ISO 8601) |
| GET | `/api/v1/rooms/` | Manual fallback room list |

## Open Questions / Follow-ups

- Add `/rooms` link to sidebar navigation
- Shared `conftest`/fixtures for desk and room booking tests
- Check-in workflow (backend + frontend)
- True PostgreSQL concurrent booking tests

## Verification

```bash
# Backend
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test python3 manage.py migrate
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/ -v

# Frontend
cd frontend
npm test
npm run lint
npm run build
```

- Backend: 70 tests passing
- Frontend: 24 tests passing
