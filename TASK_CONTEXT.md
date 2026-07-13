# Task Context: Template Cleanup (DeskHive)

## Ticket Scope

Remove placeholder and demo scaffolding from the DeskHive monorepo frontend and
backend while preserving deployment infrastructure, auth flows, routing, API
client layers, and design-system components.

### In scope
- Frontend: rebrand from Horizon Digital template to DeskHive
- Frontend: replace demo dashboard (fake metrics/jobs) with empty state and quick links
- Frontend: remove dead sidebar links to non-existent template routes
- Frontend: replace Horizon Digital logo/favicon with DeskHive assets
- Backend: simplify `seed_demo` to bootstrap only the deploy demo admin user
- Backend: update `seed_demo` tests and README

### Out of scope
- Dockerfiles, `.sunset/deploy.yaml`, nginx configs, docker-compose files
- Root-level env/Makefile/setup scripts (Horizon Digital naming retained in infra)
- Functional booking/spaces/admin API features

## Key Implementation Decisions

1. **Branding** — Application-facing copy, `index.html`, `content/index.ts`,
   `Logo`, and `favicon.svg` now use DeskHive. Login/Signup pages already
   referenced DeskHive and were left as-is.
2. **Dashboard** — Removed hard-coded workers/jobs metrics and sample job table.
   Dashboard shows `EmptyState` plus quick links to `/desks`, `/rooms`, and
   `/my/bookings`. `DashboardCard` molecule kept for design-system reuse.
3. **Sidebar** — Trimmed to routes that exist: Dashboard, My Bookings, Book Desk,
   Book Room, and admin sections. Removed jobs/calendar/clients/employees/invoicing/settings.
4. **seed_demo** — Retained command name and `demo@sunset.dev` user required by
   `.sunset/deploy.yaml`. Removed sample users, DEMO- floors/desks/rooms, and
   bookings. No migration changes needed (demo data was never in migrations).
5. **Deploy contract** — `.sunset/deploy.yaml` unchanged; `seed_demo` still satisfies
   the `seed.command` and `demo_login.username` contract.

## Files Changed

| File | Why |
|------|-----|
| `frontend/index.html` | DeskHive title and meta description |
| `frontend/env.example` | `VITE_APP_NAME=DeskHive` |
| `frontend/public/favicon.svg` | Neutral DeskHive favicon (replaced 100KB template asset) |
| `frontend/src/assets/images/deskhive-logo.svg` | New text logo |
| `frontend/src/assets/images/HD_LOGO.*.svg` | Removed Horizon Digital logo |
| `frontend/public/vite.svg` | Removed unused Vite default icon |
| `frontend/src/components/atoms/Logo/Logo.tsx` | DeskHive logo component |
| `frontend/src/content/index.ts` | DeskHive copy; sidebar/dashboard content |
| `frontend/src/pages/dashboard/DashboardPage.tsx` | Empty state + quick links |
| `frontend/src/pages/dashboard/DashboardPage.css` | Styles for new dashboard layout |
| `frontend/src/components/organisms/Sidebar/Sidebar.tsx` | Real routes only |
| `frontend/src/styles/theme.css` | Comment update |
| `backend/src/spaces/management/commands/seed_demo.py` | Admin-user-only bootstrap |
| `backend/src/spaces/tests/test_seed_demo.py` | Tests for simplified seeder |
| `backend/README.md` | Updated seed_demo documentation |

## Open Questions / Follow-ups

- Root monorepo docs (`README.md`, `env.example`, docker-compose defaults) still
  reference Horizon Digital infrastructure naming; update in a separate infra ticket
  if desired.
- Consider adding a `DashboardPage` Vitest smoke test for the empty state.

## Verification

```bash
# Frontend
cd frontend && npm test && npm run lint && npm run build

# Backend
cd backend && SECRET_KEY=test-secret-key-for-ci ALLOW_DEMO_SEED=true DEBUG=true python3 -m pytest
cd backend && SECRET_KEY=test-secret-key-for-ci DEBUG=true python3 manage.py migrate
```

Results: 68 frontend tests passed; ESLint 0 errors (3 pre-existing warnings);
production build succeeded. 129 backend tests passed; migrations apply cleanly.
