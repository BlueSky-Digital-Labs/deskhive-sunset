# Task Context: Frontend Polish (DeskHive SPA)

## Ticket Scope

Frontend polish for the DeskHive SPA under `frontend/`: unified HTTP client,
in-memory token store, toast event bus, shared loading/empty UI components,
routing enhancements, and integration across Spaces and My Bookings screens.

### In scope
- In-memory JWT store at `frontend/src/lib/auth/tokenStore.ts`
- Unified `http()` client at `frontend/src/lib/api/http.ts` with auth headers,
  JSON parsing, error mapping, token refresh, and 401 logout/redirect
- Toast event bus (`frontend/src/lib/ui/toastBus.ts`) and `ToastContainer`
- `SkeletonList`, `EmptyState`, and global styles under `frontend/src/styles/`
- `AppRouter` with catch-all 404 and `NotFound` route component
- Spaces pages (Floors, Desks, Rooms) and My Bookings use shared empty/loading UI
- API calls in spaces and bookings layers migrated to `http()`
- Vitest coverage for the HTTP client (`frontend/src/lib/api/http.test.ts`)

### Out of scope
- Backend API changes
- Admin module refactor beyond existing `apiFetch` shim (still delegates to `http()`)

## Key Implementation Decisions

1. **Token store** — `tokenStore.ts` holds the access token in memory for the
   HTTP client. The auth slice syncs via `persistTokens` / `logout`; `main.tsx`
   seeds the store from the Redux initial state.
2. **HTTP layer** — `lib/api/http.ts` is the canonical fetch wrapper. `apiFetch`
   and `fetchJson` delegate to `http()` for backward compatibility. Existing
   `lib/http.ts` remains the shared JSON/error utility module.
3. **401 handling** — On 401 with auth enabled, the client attempts one refresh
   via the Redux refresh token; if that fails, it clears tokens, dispatches
   logout, and redirects to `/login`.
4. **Toast bus** — `toastBus.ts` is a minimal pub/sub. `ToastContainer` renders
   at the app root (`main.tsx`). `ToastProvider` wraps `ToastContainer` for tests
   and legacy call sites; `useToast()` publishes to the bus.
5. **Routing** — Route definitions moved from `App.tsx` to `AppRouter.tsx`.
   Catch-all `*` route renders `NotFound`. `pages/NotFoundPage.tsx` re-exports
   the route component for existing imports.
6. **Empty/loading UI** — `EmptyState` replaces inline empty markup on Spaces
   and My Bookings screens. `SkeletonList` styles moved to `styles/skeleton.css`.

## Files Changed

| File | Why |
|------|-----|
| `frontend/src/lib/auth/tokenStore.ts` | In-memory access token store |
| `frontend/src/lib/api/http.ts` | Unified `http()` client |
| `frontend/src/lib/api/http.test.ts` | HTTP client unit tests |
| `frontend/src/lib/api.ts` | `apiFetch` delegates to `http()` |
| `frontend/src/lib/apiClient.ts` | Booking helpers use `http()` |
| `frontend/src/lib/ui/toastBus.ts` | Toast event bus |
| `frontend/src/lib/toast.tsx` | `useToast` + `ToastProvider` via bus |
| `frontend/src/components/ToastContainer.tsx` | Toast UI renderer |
| `frontend/src/components/EmptyState.tsx` | Shared empty state component |
| `frontend/src/components/SkeletonList.tsx` | Uses global skeleton styles |
| `frontend/src/styles/toast.css` | Toast styles (global) |
| `frontend/src/styles/skeleton.css` | Skeleton styles (global) |
| `frontend/src/styles/empty.css` | Empty state styles (global) |
| `frontend/src/routes/AppRouter.tsx` | Centralised routing + 404 catch-all |
| `frontend/src/routes/NotFound.tsx` | User-friendly 404 page |
| `frontend/src/App.tsx` | Slim shell delegating to `AppRouter` |
| `frontend/src/main.tsx` | Global styles, token seed, `ToastContainer` |
| `frontend/src/features/auth/authSlice.ts` | Syncs token store on auth changes |
| `frontend/src/features/spaces/api.ts` | Spaces API uses `http()` |
| `frontend/src/features/spaces/FloorsPage.tsx` | `EmptyState` integration |
| `frontend/src/features/spaces/DesksPage.tsx` | `EmptyState` integration |
| `frontend/src/features/spaces/RoomsPage.tsx` | `EmptyState` integration |
| `frontend/src/routes/my/MyBookingsRoute.tsx` | `EmptyState` integration |
| `frontend/src/pages/NotFoundPage.tsx` | Re-export shim for `NotFound` |

## Open Questions / Follow-ups

- Consider removing duplicate `ToastContainer` mount in `main.tsx` if all test
  wrappers standardise on `ToastProvider` only.
- `services/api.ts` (axios) is unused; safe to delete in a cleanup pass.
- Evaluate migrating admin API module from `apiFetch` imports to direct `http()`.

## Verification

```bash
cd frontend
npm test
npm run lint
npm run build
```

All 68 tests green; ESLint reports no errors; production build succeeds.
