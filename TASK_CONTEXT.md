# Task Context: Booking Check-In (Backend + Frontend)

## Ticket Scope

Full-stack same-day booking check-in: backend API/auto-release (completed) and frontend My Bookings UI (this change).

### Backend (completed)
- `POST /api/v1/bookings/{uuid}/check_in` — owner check-in with row locking
- `auto_release_no_shows` Celery task with Beat schedule (every 5 minutes)
- `GET /api/v1/admin/auto_release_health` — admin health probe
- Settings: `AUTO_RELEASE_ENABLED`, `AUTO_RELEASE_CUTOFF_MINUTES`, `CHECK_IN_CUTOFF_LOCALTIME`
- Booking status `released` for no-shows
- 66 backend bookings tests passing

### Frontend (this change)
- `checkIn(bookingId)` API client at `frontend/src/api/bookings.ts`
- `useCheckIn` hook wrapping Redux `checkInBooking` thunk with toast feedback
- `BookingList` + `BookingStatusBadge` components with same-day check-in button
- Optional `BookingDetail` component with shared check-in/status logic
- Toast notifications for success and 409 conflict
- 9 new frontend tests (45 total passing)

### Out of scope
- Check-in on `/rooms` page (My Bookings is the entry point)
- `resource_label` population
- Desk cutoff time config on frontend (uses local date + backend enforcement)

## Key Implementation Decisions

### Backend
1. Check-in allowed on booking day only; desk cutoff from `CHECK_IN_CUTOFF_LOCALTIME`
2. Auto-release sets `released` status (distinct from `cancelled`)
3. `select_for_update(skip_locked=True)` for concurrent auto-release workers

### Frontend
1. **No React Query / RTK Query** — project uses Redux Toolkit thunks; `useCheckIn` hook dispatches `checkInBooking` and updates `myBookings` page cache optimistically (mirrors cancel flow)
2. **API layer** — new `frontend/src/api/bookings.ts` with `checkIn()` using existing `apiFetch`; maps 409 to `CheckInConflictError`
3. **Eligibility** — `isCheckInEligible()` shows button when booking is today, upcoming, status in `pending|confirmed|active`, and (for rooms) within start/end window
4. **UI** — extracted `BookingList` from `MyBookingsRoute`; status badges via `BookingStatusBadge` with color classes per status including `released`
5. **Toasts** — lightweight `ToastProvider` in `lib/toast.tsx` (no new dependency); success on check-in, specific message on 409
6. **Status labels** — `active` displayed as "confirmed"; `checked_in` as "checked in"

## Assumptions

- Backend returns 400 for most validation failures; 409 surfaced with same-day conflict copy per task spec
- My Bookings list re-renders from Redux `pages` after optimistic check-in update
- Local timezone used for same-day eligibility (aligned with browser locale)

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/bookings/*` | Check-in API, auto-release task, health, tests |
| `backend/src/core/settings/base.py` | Auto-release settings and Beat schedule |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/api/bookings.ts` | `checkIn()` API client |
| `frontend/src/features/bookings/hooks/useCheckIn.ts` | Check-in hook with toast + Redux dispatch |
| `frontend/src/features/bookings/utils.ts` | Eligibility helper, status label formatting |
| `frontend/src/features/bookings/components/BookingList.tsx` | List with check-in/cancel actions |
| `frontend/src/features/bookings/components/BookingStatusBadge.tsx` | Colored status badges |
| `frontend/src/features/bookings/components/BookingDetail.tsx` | Optional detail view with check-in |
| `frontend/src/features/myBookings/myBookingsSlice.ts` | `checkInBooking` thunk + optimistic cache |
| `frontend/src/routes/my/MyBookingsRoute.tsx` | Uses `BookingList` |
| `frontend/src/lib/toast.tsx` | Toast provider for success/error feedback |
| `frontend/src/App.tsx` | Wrap app with `ToastProvider` |
| `frontend/src/features/myBookings/myBookings.css` | `released` status badge color |
| `frontend/src/features/bookings/hooks/useCheckIn.test.tsx` | Hook tests |
| `frontend/src/features/bookings/components/BookingList.test.tsx` | UI tests |

## API Endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/bookings/{uuid}/check_in` | Check-in; returns full booking |
| GET | `/api/v1/my/bookings/` | List (unchanged) |
| POST | `/api/v1/bookings/{uuid}/cancel/` | Cancel (unchanged) |

## Open Questions / Follow-ups

- Distinct UI label for `released` no-shows in past tab
- Share `CHECK_IN_CUTOFF_LOCALTIME` with frontend for desk button visibility
- Check-in entry point on room booking page

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

- Backend bookings: 66 tests passing
- Frontend: 45 tests passing
