# Task Context: Demo Seed Management Command (Task 11)

## Ticket Scope

Add a guarded `seed_demo` management command under the `spaces` app that seeds
demo floors, desks, rooms, and bookings (plus existing demo users), with an
`ALLOW_DEMO_SEED` environment flag to prevent accidental use in production.

### In scope
- `ALLOW_DEMO_SEED` setting in `core/settings/base.py`
- `ALLOW_DEMO_SEED=true` on backend service in `docker-compose.dev.yml` and
  `docker-compose.uat.yml` only
- `spaces` management command `seed_demo` with `--clear` option
- README documentation and pytest coverage

### Out of scope
- Frontend changes
- Production demo seeding (explicitly disabled)

## Key Implementation Decisions

1. **Settings location** — `ALLOW_DEMO_SEED` added to `core/settings/base.py`
   (the project uses a settings package, not a single `settings.py` file).
2. **Command location** — `seed_demo` lives in `spaces/management/commands/` per
   ticket; the prior `authentication` copy was removed to avoid duplicate command
   registration. User seeding logic was merged into the spaces command so deploy
   `seed.command: python manage.py seed_demo` continues to work when
   `ALLOW_DEMO_SEED=true`.
3. **DEMO- prefix** — all seeded floors, desks, and rooms use `DEMO-` names;
   `--clear` deletes bookings tied to those resources, then removes matching
   floors (cascading desks/rooms).
4. **Idempotency** — `get_or_create` for spaces; `IntegrityError` caught on
   booking creation so constraint conflicts do not abort the run.
5. **Transactions** — the seed body runs inside `transaction.atomic()`.
6. **Demo data shape** (no prior spec existed; chosen for utilisation demos):
   - 2 floors (`DEMO-Floor-1`, `DEMO-Floor-2`) in building `DEMO`
   - 6 desks on floor 1, 2 rooms on floor 2
   - 4 desk bookings (today/tomorrow) and 2 non-overlapping room bookings

## Files Changed

| File | Why |
|------|-----|
| `backend/src/core/settings/base.py` | `ALLOW_DEMO_SEED` env flag |
| `docker-compose.dev.yml` | Enable demo seed on backend in dev |
| `docker-compose.uat.yml` | Enable demo seed on backend in UAT |
| `backend/src/spaces/management/commands/seed_demo.py` | Management command |
| `backend/src/spaces/management/__init__.py` | Package init |
| `backend/src/spaces/management/commands/__init__.py` | Package init |
| `backend/src/spaces/tests/test_seed_demo.py` | Command tests |
| `backend/README.md` | Demo Seed documentation |
| `backend/src/authentication/management/commands/seed_demo.py` | **Removed** — merged into spaces command |

## Open Questions / Follow-ups

- Sunset deploy (`.sunset/deploy.yaml`) runs `seed_demo` but does not set
  `ALLOW_DEMO_SEED`; add `ALLOW_DEMO_SEED=true` to deploy env if automated
  sunset seeds should keep working without manual env configuration.
- Consider extracting shared user-seed helpers if more seed commands are added.

## Verification

```bash
cd backend
SECRET_KEY=test-secret-key PYTHONPATH=src python3 -m pytest src/spaces/tests/test_seed_demo.py -v
```
