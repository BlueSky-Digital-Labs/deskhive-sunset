# Task Context: UI Visual Enhancements (DeskHive)

## Ticket Scope

Modernize the DeskHive React frontend visual design with improved depth, a
contemporary color palette, and Material UI integration — while preserving all
existing routes, navigation, and functionality.

### In scope
- Add Material UI (`@mui/material`, `@emotion/*`, `@mui/icons-material`) with a
  custom theme aligned to DeskHive CSS variables
- Update `theme.css` to an indigo / slate / cyan palette with layered shadows
- Enhance sidebar, dashboard layout, dashboard page, empty state, auth pages,
  buttons, and dashboard cards with elevation and depth
- Wrap app in `AppThemeProvider`; include theme in test utilities
- Run frontend tests, ESLint, TypeScript check, and production build

### Out of scope
- Backend changes
- New routes or feature logic
- Replacing every custom atom (Input, etc.) with MUI — existing components kept
  for stability; MUI used for layout surfaces (Paper, Card, Avatar, Typography)

## Key Implementation Decisions

1. **Material UI over Ant Design** — MUI integrates cleanly with the existing
   CSS-variable design tokens and React 19 stack; used for elevated surfaces
   (Paper, Card) rather than a full component rewrite.
2. **Palette** — Primary indigo (`#4f46e5`), accent cyan (`#06b6d4`), slate
   neutrals. Sidebar uses a dark gradient with glow on active nav items.
3. **Depth** — New shadow tokens (`--hd-shadow-glow`, `--hd-shadow-sidebar`,
   `--hd-shadow-2xl`) applied to cards, buttons, sidebar, and auth forms.
4. **Dashboard** — Welcome header and quick-link tiles use MUI `Paper` / `Card`
   with Lucide icons; same link paths and copy for navigation parity.
5. **EmptyState** — MUI `Paper` + inbox icon; retains `role="status"` for a11y.
6. **Auth** — Login/Signup containers wrapped in MUI `Paper` with gradient page
   background; form fields unchanged (custom `Input` / `Button`).
7. **Tests** — `renderWithProviders` wraps `AppThemeProvider` so MUI components
   render correctly in Vitest.

## Files Changed

| File | Why |
|------|-----|
| `frontend/package.json` | MUI, Emotion, icons dependencies |
| `frontend/package-lock.json` | Lockfile update |
| `frontend/index.html` | Inter font, updated theme-color |
| `frontend/src/main.tsx` | `AppThemeProvider` at app root |
| `frontend/src/theme/muiTheme.ts` | MUI theme (palette, shadows, typography) |
| `frontend/src/theme/AppThemeProvider.tsx` | ThemeProvider + CssBaseline wrapper |
| `frontend/src/theme/index.ts` | Theme barrel export |
| `frontend/src/styles/theme.css` | Modern palette and shadow tokens |
| `frontend/src/styles/empty.css` | Elevated empty-state styling |
| `frontend/src/components/organisms/Sidebar/Sidebar.css` | Gradient sidebar, nav glow |
| `frontend/src/components/templates/DashboardLayout/DashboardLayout.css` | Subtle radial background |
| `frontend/src/pages/dashboard/DashboardPage.tsx` | MUI Paper/Card quick links + header |
| `frontend/src/pages/dashboard/DashboardPage.css` | Card hover depth, icon tiles |
| `frontend/src/components/EmptyState.tsx` | MUI Paper + icon |
| `frontend/src/pages/auth.css` | Gradient auth background, elevated card |
| `frontend/src/pages/Login.tsx` | MUI Paper auth container |
| `frontend/src/pages/Signup.tsx` | MUI Paper auth container |
| `frontend/src/components/atoms/Button/Button.css` | Gradient primary, glow shadow |
| `frontend/src/components/molecules/DashboardCard/DashboardCard.css` | Deeper card elevation |
| `frontend/src/test/test-utils.tsx` | AppThemeProvider in test wrapper |

## Open Questions / Follow-ups

- Consider migrating custom `Input` to MUI `TextField` in a follow-up for
  consistent form styling.
- Admin feature pages (`SpacesPage`, `UtilisationPage`) could adopt MUI tables
  and tabs in a separate polish pass.
- Dark-mode MUI theme variant could be wired to `prefers-color-scheme` explicitly.

## Verification

```bash
cd frontend && npm test && npm run lint && npm run build
```

Results: 68 frontend tests passed; ESLint 0 errors (3 pre-existing warnings);
TypeScript and production build succeeded.
