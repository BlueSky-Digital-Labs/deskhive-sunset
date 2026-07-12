# Task Context: My Bookings (Backend + Frontend)

## Ticket Scope

Full-stack My Bookings: backend list/cancel APIs and a React screen for upcoming/past bookings with optimistic cancel and pagination.

### Backend (completed)
- `GET /api/v1/my/bookings` with `bucket`, `resource_type`, pagination (20)
- `POST /api/v1/bookings/{id}/cancel/` for upcoming active bookings
- Extended `BookingSerializer` (`resource_label`, `is_upcoming`)
- 43 backend bookings tests passing

### Frontend (this change)
- `myBookingsSlice` with paginated fetch + optimistic cancel/rollback
- `MyBookingsRoute` at `/my/bookings` with Upcoming/Past tabs, URL query sync, pagination, skeleton/empty states
- API client helpers: `getMyBookings`, `postBookingCancel`
- Sidebar link and protected route
- Vitest coverage for slice and route interactions

### Out of scope
- Booking detail modal/drawer (list row shows schedule + status)
- `resource_label` population (backend placeholder until Spaces BE)
- Migrating `/rooms` page to the new cancel endpoint

## Key Implementation Decisions

### Backend
1. Status vocabulary maps `active` → pending/confirmed; cancellable = `active` only
2. Bucket: upcoming uses desk `date >= today` / room `end_at >= now`; past uses inverse OR `cancelled`
3. `is_upcoming` in serializer: desk `date >= today`, room `start_at >= now`

### Frontend
1. **API client** — Task references `fetchJson`; project uses `apiFetch` from `@/lib/api` (same auth/refresh behavior)
2. **Store** — Reducer registered in `frontend/src/store/index.ts` (no `app/store.ts` in repo)
3. **Page cache key** — `${bucket}:${page}` in `pages` record for independent pagination state
4. **Optimistic cancel** — Pending sets `status: cancelled` immediately; rejected restores rollback snapshot; failed cancel shows inline error + “Retry cancel”
5. **Cancellable UI** — `is_upcoming` plus statuses `pending`/`confirmed`/`active` (maps backend `active`)
6. **URL state** — `?bucket=upcoming|past&page=N` drives tab + pagination; tab switch resets to page 1
7. **Navigation** — Protected `/my/bookings` route + sidebar “My Bookings” entry

## Assumptions

- Backend paginated response shape: `{ count, next, previous, results }`
- Cancel endpoint returns updated booking JSON (200)
- Display `active` status as “confirmed” in UI
- Rooms page on `/rooms` keeps existing `DELETE` cancel via `roomBookingsSlice`

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/bookings/*` | My Bookings API, cancel action, tests, index |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/features/myBookings/myBookingsSlice.ts` | State, fetch/cancel thunks |
| `frontend/src/features/myBookings/myBookingsSlice.test.ts` | Thunk unit tests |
| `frontend/src/features/myBookings/myBookings.css` | Screen styles |
| `frontend/src/routes/my/MyBookingsRoute.tsx` | Unified bookings UI |
| `frontend/src/routes/my/MyBookingsRoute.test.tsx` | Route integration tests |
| `frontend/src/lib/apiClient.ts` | `getMyBookings`, `postBookingCancel`, `MyBooking` type |
| `frontend/src/store/index.ts` | Register `myBookings` reducer |
| `frontend/src/test/test-utils.tsx` | Test store includes `myBookings` |
| `frontend/src/App.tsx` | Protected `/my/bookings` route |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Nav link |
| `frontend/src/features/spaces/RoomsPage.test.tsx` | Stabilize datetime validation test |

## API Endpoints (frontend)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/my/bookings/` | `?bucket=&page=` |
| POST | `/api/v1/bookings/{uuid}/cancel/` | Optimistic cancel |
| DELETE | `/api/v1/bookings/{uuid}/` | Still used by `/rooms` page |

## Open Questions / Follow-ups

- Booking detail view / deep link to desk or room
- Wire `resource_label` when Spaces API ready
- Consolidate room page onto `myBookingsSlice` cancel endpoint
- i18n for sidebar “My Bookings” label via content hook

## Verification

```bash
# Backend
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/bookings/tests/ -v

# Frontend
cd frontend
npm test
npm run lint
npm run build
```

- Backend bookings: 43 tests passing
- Frontend: 34 tests passing
