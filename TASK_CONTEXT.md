# Task Context: Booking Check-in and Auto-Release No-Shows

## Ticket Scope

Backend workflow for DeskHive bookings:

- **Check-in API** — authenticated users check in to their own active desk or room bookings
- **Auto-release Celery task** — periodic job cancels unchecked bookings after a configurable grace period
- **Health probe** — reports auto-release configuration for ops/monitoring
- **Celery Beat schedule** — registers `auto_release_no_shows` on a configurable interval

### Out of scope

- Frontend check-in UI
- Email/push notifications on auto-release
- PostgreSQL-only concurrent auto-release tests

## Key Implementation Decisions

1. **Settings location** — Project uses `core.settings.base` (not a flat `settings.py`). Booking auto-release settings are env-driven with sensible defaults.
2. **Check-in endpoint** — `POST /api/v1/bookings/{uuid}/check-in/` returns the updated booking (`200`). Owner-only; `404` for other users' bookings.
3. **Check-in windows**
   - **Desk** — opens at start of booking date; closes at desk deadline (`BOOKING_DESK_CHECK_IN_DEADLINE_TIME`, default `10:00`) plus grace (`BOOKING_AUTO_RELEASE_GRACE_MINUTES`).
   - **Room** — opens `BOOKING_CHECK_IN_EARLY_MINUTES` before `start_at`; closes at `end_at`.
4. **Auto-release cutoffs**
   - **Desk** — deadline time on booking date + grace minutes
   - **Room** — `start_at` + grace minutes (unchecked active bookings only)
5. **Checked-in bookings** — never auto-released (`status=checked_in` excluded by querying only `active`).
6. **Celery** — explicit import in `core/celery.py` plus `autodiscover_tasks()`; Beat interval from `BOOKING_AUTO_RELEASE_BEAT_INTERVAL_SECONDS` (default 300s).
7. **Health endpoint** — `GET /api/v1/bookings/health/auto-release/` (unauthenticated) returns enabled flag and timing settings.
8. **Docker** — Redis already present in `docker-compose.dev.yml` / `docker-compose.uat.yml`; added auto-release env vars to backend/celery services.

## Assumptions

- Desk no-show deadline is a fixed local time (`10:00` UTC by default) on the booking date, not tied to room-style `start_at`.
- Auto-release cancels bookings (`status=cancelled`) rather than a separate `no_show` status.
- Idempotent re-check-in returns `400` with a clear message.
- SQLite test DB is sufficient; overlap/exclusion constraints remain PostgreSQL-specific from prior work.

## Files Changed

| File | Why |
|------|-----|
| `backend/src/bookings/exceptions.py` | `CheckInNotAllowed` exception |
| `backend/src/bookings/services.py` | `check_in_booking`, cutoff helpers, `release_no_show_bookings` |
| `backend/src/bookings/tasks.py` | `auto_release_no_shows` Celery task |
| `backend/src/bookings/views.py` | `BookingCheckInView` |
| `backend/src/bookings/health.py` | `AutoReleaseHealthView` |
| `backend/src/bookings/urls.py` | Check-in and health routes |
| `backend/src/core/celery.py` | Import `auto_release_no_shows` |
| `backend/src/core/settings/base.py` | Auto-release settings + Beat schedule entry |
| `backend/src/bookings/tests/test_check_in.py` | Check-in service and API tests |
| `backend/src/bookings/tests/test_auto_release.py` | Auto-release task, service, health tests |
| `backend/env.example` | Auto-release env documentation |
| `env.example` | Root env template for auto-release vars |
| `docker-compose.dev.yml` | Auto-release env on backend/celery services |
| `docker-compose.uat.yml` | Auto-release env on backend/celery services |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/bookings/{uuid}/check-in/` | JWT | Check in to own active booking |
| GET | `/api/v1/bookings/health/auto-release/` | None | Auto-release configuration probe |

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `BOOKING_AUTO_RELEASE_ENABLED` | `True` | Toggle periodic no-show release |
| `BOOKING_AUTO_RELEASE_GRACE_MINUTES` | `15` | Grace after deadline/start before release |
| `BOOKING_DESK_CHECK_IN_DEADLINE_TIME` | `10:00` | Desk check-in deadline (HH:MM) |
| `BOOKING_CHECK_IN_EARLY_MINUTES` | `30` | How early room check-in opens |
| `BOOKING_AUTO_RELEASE_BEAT_INTERVAL_SECONDS` | `300` | Celery Beat interval |

## Open Questions / Follow-ups

- Frontend check-in button/flow on `/rooms` and desk pages
- Admin visibility into auto-released bookings (audit log)
- Per-building desk deadline times instead of a single global setting
- Metrics: last run timestamp / release count on health endpoint

## Verification

```bash
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src DJANGO_SETTINGS_MODULE=core.settings.test python3 manage.py migrate
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/ -v
python3 -m flake8 src/bookings/ src/core/celery.py src/core/settings/base.py
```

- Backend: **87 tests passing** (17 new for check-in / auto-release)
