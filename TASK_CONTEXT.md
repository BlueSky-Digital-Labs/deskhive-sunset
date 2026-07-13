# Task Context: Admin Spaces CRUD and Utilisation (Backend + Frontend)

## Ticket Scope

Admin management of spaces (floors, desks, rooms) and utilisation reporting across backend APIs and frontend admin screens.

### Backend (completed)
- Admin CRUD viewsets under `/api/v1/admin/floors|desks|rooms/` with `IsAdminUser`
- Optional `?is_active=true|false` filtering
- `GET /api/v1/admin/utilisation` with `start_date`, `end_date`, optional `floor_id`
- `/api/v1/auth/me/` exposes `is_staff` and `is_superuser` for frontend admin gating

### Frontend (this change)
- `/admin/spaces` tabbed CRUD UI for floors, desks, and rooms
- `/admin/utilisation` date-range and floor-filtered utilisation dashboard
- React Query hooks for admin spaces and utilisation data
- Admin route gating (`isAdmin` from `/me`, non-admins redirected to `/404`)
- Sidebar admin links for staff users

### Out of scope
- Time-weighted room occupancy metrics
- Moving auto-release health endpoint into `admin_api`

## Key Implementation Decisions

### Backend
1. Separate public and admin viewsets — public `/api/v1/floors|desks|rooms/` remain `IsAuthenticated`
2. Utilisation counts `active`, `checked_in`, `released` bookings; excludes `cancelled`
3. `MeSerializer` includes `is_staff` / `is_superuser` for frontend role checks

### Frontend
1. **React Query** — added `@tanstack/react-query` for admin list/mutation hooks (existing features remain Redux)
2. **Admin gating** — `deriveIsAdmin()` checks `/me` staff flags with JWT payload fallback
3. **Soft delete preference** — primary deactivation via `is_active` toggle; hard delete requires confirmation dialog
4. **Error handling** — `403` surfaces "Admins only"; `401` redirects to login via existing `apiFetch` + page handlers
5. **Reusable table** — `SpacesTable` parameterized by `SpaceKind` for floors/desks/rooms

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/spaces/views.py` | Admin viewsets with `IsActiveFilterMixin` |
| `backend/src/spaces/urls.py` | Admin router registration |
| `backend/src/admin_api/*` | Utilisation service, view, tests |
| `backend/src/core/settings/base.py` | Register `admin_api` app |
| `backend/src/core/urls.py` | Include admin API URLs |
| `backend/src/accounts/serializers.py` | Expose `is_staff` / `is_superuser` on `/me` |
| `backend/src/spaces/tests/test_admin_crud.py` | Admin CRUD tests |
| `backend/README.md` | Admin endpoint documentation |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/api/admin.ts` | Admin spaces CRUD + utilisation API client |
| `frontend/src/features/admin/types.ts` | Admin domain types |
| `frontend/src/features/admin/hooks/useSpaces.ts` | React Query hooks for spaces CRUD/toggle |
| `frontend/src/features/admin/hooks/useUtilisation.ts` | React Query hook for utilisation report |
| `frontend/src/features/admin/components/*` | `SpacesTable`, `SpaceFormModal`, confirm/status UI |
| `frontend/src/features/admin/pages/SpacesPage.tsx` | Tabbed admin spaces management |
| `frontend/src/features/admin/pages/UtilisationPage.tsx` | Utilisation dashboard |
| `frontend/src/routes/AdminRoutes.tsx` | Nested `/admin` routes |
| `frontend/src/routes/AdminRoute.tsx` | Admin-only route guard |
| `frontend/src/pages/NotFoundPage.tsx` | 404 destination for non-admin users |
| `frontend/src/utils/isAdmin.ts` | Admin role derivation |
| `frontend/src/hooks/useAuth.ts` | Expose `isAdmin` |
| `frontend/src/types/auth.ts` | Staff fields on `User` |
| `frontend/src/App.tsx` | Wire admin and 404 routes |
| `frontend/src/main.tsx` | `QueryClientProvider` |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Admin nav links |
| `frontend/src/test/test-utils.tsx` | Query client test wrapper |
| `frontend/package.json` | `@tanstack/react-query` dependency |

## API Endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/api/v1/admin/floors/` | Admin floor list/create |
| GET/PATCH/DELETE | `/api/v1/admin/floors/{id}/` | Admin floor detail |
| GET/POST | `/api/v1/admin/desks/` | Admin desk list/create |
| GET/PATCH/DELETE | `/api/v1/admin/desks/{id}/` | Admin desk detail |
| GET/POST | `/api/v1/admin/rooms/` | Admin room list/create |
| GET/PATCH/DELETE | `/api/v1/admin/rooms/{id}/` | Admin room detail |
| GET | `/api/v1/admin/utilisation` | Utilisation dashboard |
| GET | `/api/v1/auth/me/` | Includes `is_staff`, `is_superuser` |

## Frontend Routes

| Path | Page |
|------|------|
| `/admin/spaces` | Spaces CRUD (Floors / Desks / Rooms tabs) |
| `/admin/utilisation` | Utilisation summary + daily table |
| `/404` | Not found / access denied fallback |

## Open Questions / Follow-ups

- Time-weighted room utilisation instead of booking-count rates
- OpenAPI tags for admin endpoints in drf-spectacular
- Dedicated "access denied" page copy vs generic 404

## Verification

```bash
# Backend
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/accounts/tests/ src/spaces/tests/ src/admin_api/tests/ -v

# Frontend
cd frontend
npm test
npm run lint
npm run build
```

- Backend: accounts + spaces + admin_api tests passing
- Frontend: 51 tests passing; Vite build succeeds
