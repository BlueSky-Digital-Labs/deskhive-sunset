# Task Context: DeskHive Sunset — Spaces Feature (Backend + Frontend)

## Ticket Scope

### Backend (completed)
JWT-secured `spaces` Django app with Floor, Desk, and Room models, CRUD REST endpoints, and stubbed availability APIs.

### Frontend (this change)
React pages and API integration for browsing floors and checking desk/room availability:
- Protected routes: `/spaces/floors`, `/spaces/desks`, `/spaces/rooms`
- API client functions in `features/spaces/api.ts` using shared `lib/api.ts`
- Local component state via `useState` + `useEffect` (no Redux slice — auth already in Redux)
- Shared `AvailabilityBadge` and `SkeletonList` components
- Vitest + RTL tests for all three pages

### Out of scope
- Real booking/reservation UI logic (availability is stubbed as all-available on backend)
- Sidebar navigation links to spaces pages (routes are direct URL access)
- Docker configuration changes

## Key Implementation Decisions

### Backend
1. **`spaces` app** at `backend/src/spaces/` with models, serializers, viewsets, availability service.
2. **Floor uniqueness** — `UniqueConstraint` on `(building, level, name)`.
3. **Desk/Room indexes** — `Index(fields=['floor', 'is_active'])` for availability queries.
4. **Availability stub** — active resources return `available: true` until bookings exist.
5. **Serializer validation** — `UniqueTogetherValidator` returns HTTP 400 for duplicates.

### Frontend
1. **Local state** — pages fetch on mount / input change with `useEffect`; no `spacesSlice` needed for v1.
2. **API layer** — `features/spaces/api.ts` unwraps paginated list responses (`results`) and calls availability endpoints with query params.
3. **401 handling** — delegated to shared `apiFetch` (refresh retry, then logout).
4. **DesksPage** — date picker defaults to today; optional client-side floor filter from `getFloors()`.
5. **RoomsPage** — `datetime-local` inputs; blocks fetch and shows validation error when `start >= end`.
6. **Layout** — all pages use existing `DashboardLayout` for consistent shell.

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/spaces/` | Models, serializers, views, availability service, URLs, migrations, tests |
| `backend/src/core/settings/base.py` | Register `spaces` app |
| `backend/src/core/urls.py` | Mount `/api/v1/` spaces routes |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/App.tsx` | Protected routes for floors, desks, rooms pages |
| `frontend/src/features/spaces/api.ts` | Spaces API functions |
| `frontend/src/features/spaces/types.ts` | Floor, Desk, Room, availability types |
| `frontend/src/features/spaces/FloorsPage.tsx` | Floor list with loading/empty/error states |
| `frontend/src/features/spaces/DesksPage.tsx` | Desk availability by date with floor filter |
| `frontend/src/features/spaces/RoomsPage.tsx` | Room availability by datetime range |
| `frontend/src/features/spaces/spaces.css` | Shared spaces page styles |
| `frontend/src/features/spaces/*.test.tsx` | Page render and interaction tests |
| `frontend/src/components/AvailabilityBadge.tsx` | Available/occupied status badge |
| `frontend/src/components/SkeletonList.tsx` | Loading skeleton placeholder |

## API Endpoints (Backend)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/floors/` | List floors (paginated) |
| GET | `/api/v1/desks/` | List desks (paginated) |
| GET | `/api/v1/rooms/` | List rooms (paginated) |
| GET | `/api/v1/availability/desks/?date=YYYY-MM-DD` | Desk availability (stub) |
| GET | `/api/v1/availability/rooms/?start=ISO&end=ISO` | Room availability (stub) |

All require `Authorization: Bearer <access_token>`.

## Assumptions and Limitations (v1)

- Availability always shows active resources as available; occupied state appears only after bookings integration.
- List endpoints are paginated (page size 20); frontend reads first page only.
- Floor filter on DesksPage is client-side over availability results.
- RoomsPage converts `datetime-local` values to ISO before API calls.
- No sidebar links yet — navigate directly to `/spaces/*` routes.

## Open Questions / Follow-ups

- Add sidebar navigation entries for spaces pages.
- Integrate booking models for real availability on backend and frontend.
- Add pagination UI if floor/desk/room counts exceed page size.
- Cache availability responses in Redux if cross-page sharing is needed.

## Verification

```bash
# Backend
cd backend
PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test python3 manage.py migrate
PYTHONPATH=src python3 -m pytest src/spaces/tests/test_spaces_api.py src/accounts/tests/test_auth.py -v

# Frontend
cd frontend
npm run test
npm run lint
npm run build
```

- Backend: 34 tests passing (24 spaces + 10 accounts)
- Frontend: 13 tests passing (7 spaces + 6 existing auth/routing)
