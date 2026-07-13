# Task Context: Booking Check-In and Auto-Release

## Ticket Scope

Implement booking check-in workflow and Celery-based auto-release for no-show desk and room bookings.

### In scope
- `POST /api/v1/bookings/{uuid}/check_in` — owner check-in with row locking
- `auto_release_no_shows` Celery task with Beat schedule (every 5 minutes)
- `GET /api/v1/admin/auto_release_health` — admin health probe for last auto-release run
- Settings: `AUTO_RELEASE_ENABLED`, `AUTO_RELEASE_CUTOFF_MINUTES`, `CHECK_IN_CUTOFF_LOCALTIME`
- New booking status: `released` (terminal, frees resource like `cancelled`)
- Tests for check-in, auto-release concurrency, and health endpoint

### Out of scope
- Frontend check-in UI
- `resource_label` population
- Migrating existing cancel flows to use `released`

## Key Implementation Decisions

1. **Check-in rules** — Same calendar day only (`booking.date == localdate()`). Desk check-in allowed until `CHECK_IN_CUTOFF_LOCALTIME` (default `10:00`). Room check-in allowed between `start_at` and `end_at` on the booking day. Only `active` bookings are eligible.
2. **Auto-release** — Active bookings past cutoff are set to `released` (not `cancelled`) so no-show handling is distinct from user cancellation. Desk cutoff = `CHECK_IN_CUTOFF_LOCALTIME + AUTO_RELEASE_CUTOFF_MINUTES`; room cutoff = `start_at + AUTO_RELEASE_CUTOFF_MINUTES`.
3. **Concurrency** — Check-in and auto-release use `select_for_update()` inside atomic transactions; auto-release uses `skip_locked=True` so parallel workers do not block each other.
4. **Health probe** — `IsAdminUser` permission; returns `last_auto_release_run_at` from Django cache (`bookings:last_auto_release_run_at`), set after each successful auto-release run.
5. **DRF exceptions** — Check-in view raises `NotFound`, `PermissionDenied`, and `ValidationError` for appropriate HTTP statuses.
6. **Past bucket** — `released` bookings included in `PAST_TERMINAL_STATUSES` for My Bookings past bucket.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/bookings/__init__.py` | New app package init |
| `backend/src/bookings/apps.py` | AppConfig per ticket spec |
| `backend/src/bookings/models.py` | Added `STATUS_RELEASED` |
| `backend/src/bookings/exceptions.py` | Added `CheckInNotAllowed` |
| `backend/src/bookings/services.py` | `check_in_booking`, `auto_release_no_show_bookings`, cutoff helpers |
| `backend/src/bookings/views.py` | `BookingCheckInView` APIView |
| `backend/src/bookings/urls.py` | Check-in and health routes |
| `backend/src/bookings/tasks.py` | `auto_release_no_shows` Celery task |
| `backend/src/bookings/health.py` | `AutoReleaseHealthView` |
| `backend/src/bookings/tests/test_check_in.py` | Check-in service and API tests |
| `backend/src/bookings/tests/test_auto_release.py` | Auto-release, task, health tests |
| `backend/src/core/settings/base.py` | Auto-release settings and Beat schedule |

## API Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/v1/bookings/{uuid}/check_in` | Authenticated owner | Returns booking JSON (200) |
| GET | `/api/v1/admin/auto_release_health` | Admin | Returns `last_auto_release_run_at` |

## Settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `AUTO_RELEASE_ENABLED` | `True` | Toggle auto-release task |
| `AUTO_RELEASE_CUTOFF_MINUTES` | `15` | Grace after desk deadline / room start |
| `CHECK_IN_CUTOFF_LOCALTIME` | `10:00` | Latest desk check-in time (local) |

## Open Questions / Follow-ups

- Should `released` bookings appear with a distinct label in My Bookings UI?
- Timezone alignment for `CHECK_IN_CUTOFF_LOCALTIME` if org operates outside UTC
- Prometheus/metrics integration for auto-release counts

## Verification

```bash
cd backend
pip install -r requirements.txt
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/bookings/tests/ -v
SECRET_KEY=test-secret-key DJANGO_SETTINGS_MODULE=core.settings.test PYTHONPATH=src python3 manage.py test bookings
```

- Bookings tests: 66 passing (23 new for check-in / auto-release)
