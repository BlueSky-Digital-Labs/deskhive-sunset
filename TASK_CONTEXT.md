# Task Context: Desk Booking Redux UI

## Ticket Scope

Implement frontend desk booking with Redux state management, a shared API client
foundation, protected routing, and test coverage.

### In scope
- `fetchJson` helper in `frontend/src/lib/apiClient.ts` with auth header injection
  and 401 logout/redirect handling
- `frontend/src/lib/http.ts` for JSON parsing, error mapping, and HTTP 409 detection
- Auth slice at `frontend/src/features/auth/authSlice.ts` with `setCredentials`,
  `logout`, `selectAccessToken`, and `selectIsAuthenticated`
- Redux store at `frontend/src/app/store.ts` with `auth`, `deskAvailability`, and
  `deskBookings` reducers (plus existing room/myBookings reducers for compatibility)
- Desk availability and booking slices with thunks for fetch/create/cancel
- `/desks` route (`DesksRoute`) with date picker, book/cancel actions, loading and
  empty states
- Jest/Vitest tests, lint, type-check, and production build verification

### Out of scope
- Backend API changes (desk availability and booking endpoints already exist)
- Replacing the read-only `/spaces/desks` availability page

## Key Implementation Decisions

1. **Store location** — Canonical store moved to `frontend/src/app/store.ts`.
   `frontend/src/store/index.ts` re-exports for existing `@store/*` imports.
2. **Auth slice** — Implemented at `frontend/src/features/auth/authSlice.ts` with
   the ticket's `setCredentials`/`selectAccessToken` API while preserving existing
   login/signup/refresh thunks used across the app. `store/authSlice.ts` re-exports.
3. **HTTP layer** — `http.ts` centralises JSON parsing and `HttpError`; `api.ts`
   re-exports it as `ApiError` for backward compatibility.
4. **fetchJson** — New low-level client used by desk slices; existing room/my
   bookings flows continue using `apiFetch`/`postBooking`.
5. **Desk availability state** — `byDate` map keyed by ISO date string, each entry
   tracking `status`, `desks[]`, and optional `error`.
6. **Desk booking conflicts** — `createDeskBooking` maps HTTP 409 to `lastError`;
   inline alert in UI (matching room booking UX); non-409 failures use toasts.
7. **Cancel optimistic updates** — `cancelBooking` marks booking cancelled on
   pending, rolls back from `cancelRollbackById` on rejection.
8. **Desk booking payload** — `POST /api/v1/bookings/` with
   `{ desk_id, booking_date }`; cancel via `DELETE /api/v1/bookings/{id}/`.

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/lib/http.ts` | JSON/error helpers and 409 detection |
| `frontend/src/lib/http.test.ts` | Unit tests for http helpers |
| `frontend/src/lib/api.ts` | Refactored to use `http.ts` |
| `frontend/src/lib/apiClient.ts` | Added `fetchJson`, desk booking helpers |
| `frontend/src/features/auth/authSlice.ts` | Canonical auth slice with selectors |
| `frontend/src/store/authSlice.ts` | Re-export shim for `@store/authSlice` |
| `frontend/src/app/store.ts` | Redux store with desk + existing reducers |
| `frontend/src/store/index.ts` | Re-export shim for `@store/index` |
| `frontend/src/main.tsx` | Import store from `@/app/store` |
| `frontend/src/features/desks/deskAvailabilitySlice.ts` | Date-keyed availability thunk |
| `frontend/src/features/desks/deskBookingsSlice.ts` | Create/cancel desk booking thunks |
| `frontend/src/features/desks/deskAvailabilitySlice.test.ts` | Slice tests |
| `frontend/src/features/desks/deskBookingsSlice.test.ts` | Slice tests incl. rollback |
| `frontend/src/routes/desks/DesksRoute.tsx` | Desk booking UI |
| `frontend/src/routes/desks/DesksRoute.test.tsx` | Route integration tests |
| `frontend/src/App.tsx` | `/desks` protected route |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Nav links for desks/rooms |
| `frontend/src/test/test-utils.tsx` | Test store includes desk reducers |

## Open Questions / Follow-ups

- Consider consolidating room and desk booking slices behind a shared bookings
  abstraction if more resource types are added.
- `/spaces/desks` remains a read-only availability view; evaluate merging with
  `/desks` or cross-linking in a future UX pass.
- ESLint full-project run hit a transient vitest temp-file ENOENT; targeted lint
  on changed files passes cleanly.

## Verification

```bash
cd frontend
npm test
npm run build
npx eslint src/lib/http.ts src/lib/apiClient.ts src/lib/api.ts src/app/store.ts \
  src/features/auth/authSlice.ts src/features/desks/*.ts src/routes/desks/*.tsx \
  src/App.tsx src/main.tsx src/test/test-utils.tsx \
  src/components/organisms/Sidebar/Sidebar.tsx
```

All 64 tests green; production build succeeds.
