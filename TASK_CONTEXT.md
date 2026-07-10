# Task Context: JWT Authentication Module (accounts app)

## Ticket Scope

Implement Django REST Framework JWT authentication endpoints for register, login, refresh token, and current user (`/me`) under the `/api/v1/auth/` prefix in the `backend/` service.

## Key Implementation Decisions

1. **New `accounts` app** — Created at `backend/src/accounts/` with register, login (SimpleJWT `TokenObtainPairView`), refresh (`TokenRefreshView`), and me endpoints as specified.
2. **Custom user model compatibility** — The project uses `authentication.User` (email-only, no `username`/`first_name`/`last_name`). Serializers use `get_user_model()` instead of `django.contrib.auth.models.User`, and expose `id`, `email`, and `date_joined` on the me/register response.
3. **Settings location** — Settings live in `backend/src/core/settings/base.py` (not a flat `settings.py`). Added `accounts` to `LOCAL_APPS`, enabled `rest_framework_simplejwt.token_blacklist` (required by existing `BLACKLIST_AFTER_ROTATION=True`), and set default access token lifetime to 5 minutes.
4. **Coexistence with `authentication` app** — The legacy `/api/auth/` routes remain unchanged. New v1 routes are mounted at `/api/v1/auth/`.
5. **Duplicate email validation** — `RegistrationSerializer.validate_email` returns HTTP 400 for duplicate emails instead of raising an unhandled `IntegrityError`.
6. **Test settings** — Added `core.settings.test` with SQLite for pytest in environments without PostgreSQL/Docker.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/accounts/` (new) | JWT auth endpoints: apps, serializers, views, urls, tests |
| `backend/src/core/settings/base.py` | Register `accounts` app, token blacklist app, 5-min JWT default |
| `backend/src/core/settings/test.py` (new) | SQLite test database for pytest |
| `backend/src/core/urls.py` | Mount `api/v1/auth/` routes |
| `backend/pytest.ini` (new) | Pytest/Django test configuration |
| `backend/env.example` | Document 5-minute default access token lifetime |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register/` | Register user (201 + user profile) |
| POST | `/api/v1/auth/login/` | Obtain access + refresh tokens |
| POST | `/api/v1/auth/refresh/` | Refresh access token |
| GET | `/api/v1/auth/me/` | Current user (JWT required) |

## Open Questions / Follow-ups

- Frontend still calls `/api/auth/*`; consider updating `frontend/src/services/authService.ts` to use `/api/v1/auth/` when ready.
- `first_name` / `last_name` were omitted from serializers because the custom `User` model does not define those fields. Add them to the model if profile names are needed.
- Docker-based `make test` still uses `manage.py test`; pytest is the configured runner for the new `accounts` tests (`python3 -m pytest` from `backend/`).

## Verification

```bash
cd backend && PYTHONPATH=src python3 -m pytest src/accounts/tests/test_auth.py -v
```

All 10 accounts auth tests and 5 existing authentication model tests pass.
