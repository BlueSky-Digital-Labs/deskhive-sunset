# Task Context: DeskHive Sunset — Auth Stack

## Ticket Scope

### Backend (completed)
JWT authentication API under `/api/v1/auth/` for register, login, refresh, and current user.

### Frontend (this change)
React 19 + TypeScript + Vite + Redux Toolkit auth flow:
- Auth slice with `accessToken`, `refreshToken`, `user`, `status`, `error`
- Fetch-based API client with single 401 refresh retry
- Login/Signup pages, protected routing, bootstrap refresh on app load
- Vitest + React Testing Library component tests

## Key Implementation Decisions

### Backend
1. **`accounts` app** at `backend/src/accounts/` — register, login (SimpleJWT), refresh, me endpoints.
2. **Custom user model** — `authentication.User` is email-only; serializers use `get_user_model()`.
3. **Legacy routes preserved** — `/api/auth/` unchanged; v1 at `/api/v1/auth/`.
4. **Test settings** — `core.settings.test` uses SQLite for pytest without PostgreSQL.

### Frontend
1. **`store/authSlice.ts`** — Replaces `store/slices/authSlice.ts`. State shape uses `accessToken`/`refreshToken`/`status` per spec. Thunks: `login`, `signup`, `refresh`, `fetchProfile`, `logout`.
2. **`lib/api.ts`** — Native `fetch` wrapper reads tokens from Redux (dynamic store import avoids circular deps). On 401, attempts one refresh; dispatches `logout` if refresh fails.
3. **API base path** — Frontend now calls `/api/v1/auth/*` to match the new backend module.
4. **Signup flow** — Register endpoint returns profile only (no tokens); signup thunk chains into `login` to obtain JWT pair.
5. **Pages** — `pages/Login.tsx` and `pages/Signup.tsx` with accessible forms and client-side validation. `/register` redirects to `/signup`.
6. **`ProtectedRoute`** — Reads auth state from Redux; requires both `accessToken` and `user`.
7. **App bootstrap** — `useEffect` dispatches `refresh()` when a stored refresh token exists on load.
8. **Tests** — Vitest + RTL; 6 tests for Login, Signup, ProtectedRoute.

## Files Changed

### Backend
| File | Why |
|------|-----|
| `backend/src/accounts/` | JWT auth endpoints and tests |
| `backend/src/core/settings/base.py` | Register apps, JWT defaults, token blacklist |
| `backend/src/core/settings/test.py` | SQLite test DB |
| `backend/src/core/urls.py` | Mount `api/v1/auth/` |
| `backend/pytest.ini` | Pytest configuration |

### Frontend
| File | Why |
|------|-----|
| `frontend/src/store/authSlice.ts` | Redux auth state and thunks |
| `frontend/src/lib/api.ts` | Fetch wrapper with 401 refresh retry |
| `frontend/src/pages/Login.tsx` | Login form and thunk dispatch |
| `frontend/src/pages/Signup.tsx` | Signup form and thunk dispatch |
| `frontend/src/pages/auth.css` | Shared auth page styles |
| `frontend/src/components/ProtectedRoute.tsx` | Auth-gated route wrapper |
| `frontend/src/App.tsx` | Routes, bootstrap refresh |
| `frontend/src/hooks/useAuth.ts` | Updated for new auth state |
| `frontend/src/types/auth.ts` | Updated auth types |
| `frontend/src/services/authService.ts` | Updated to v1 API (legacy helper) |
| `frontend/vitest.config.ts` | Test runner config |
| `frontend/src/test/` | Test setup and store helper |
| `frontend/src/**/*.test.tsx` | Component tests |
| `frontend/package.json` | Vitest and testing-library deps |

## Endpoints (Backend)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register/` | Register user (201 + profile) |
| POST | `/api/v1/auth/login/` | Obtain access + refresh tokens |
| POST | `/api/v1/auth/refresh/` | Refresh access token |
| GET | `/api/v1/auth/me/` | Current user (JWT required) |

## Open Questions / Follow-ups

- `first_name` / `last_name` not on custom User model; add if profile names are needed.
- Legacy `services/api.ts` (axios) remains but is unused by the new auth flow.
- Docker `make test` in backend still uses `manage.py test`; pytest is the runner for accounts tests.

## Verification

```bash
# Backend
cd backend && PYTHONPATH=src python3 -m pytest src/accounts/tests/test_auth.py -v

# Frontend
cd frontend && npm run test && npm run lint && npm run build
```

All backend accounts tests (10) and frontend component tests (6) pass. ESLint and `tsc -b` are clean.
