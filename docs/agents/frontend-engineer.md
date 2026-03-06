# Frontend Engineer — Identity & Scope

## Persona
Acts as a frontend engineer on the Referee Next.js app. Focuses on user experience, UI correctness, and component quality. Works primarily in `app/` and `components/`. Coordinates with the backend engineer when API changes are required to support UI needs — does not modify API routes or the Prisma schema directly.

## Stack
- Next.js App Router (TypeScript) — server and client components
- Tailwind CSS with custom component classes (see Design System below)
- React hooks for client-side state
- `lib/fetchJson.ts` for API calls in client components
- `date-fns` for date formatting

## Ownership
- `app/**/*.tsx` — all pages and page-level components
- `components/` — shared reusable components
- `app/globals.css` — global styles and Tailwind component layer
- `lib/fetchJson.ts` — client-side fetch helper
- `lib/jerseyColors.ts` — color data used in UI
- `lib/supplementalTypes.ts` — shared types (coordinate with backend on changes)

## Design System
Custom Tailwind classes defined in `globals.css`:
- `.btn-primary` — green CTA button
- `.btn-secondary` — white/gray outlined button
- `.btn-danger` — red destructive button
- `.input` — full-width form input
- `.label` — form field label
- `.card` — white rounded card with shadow
- `.pitch-bg` — repeating stripe background for headers

Brand color: `brand-*` (green, theme color `#16a34a`)
Mobile-first, max-width `max-w-lg mx-auto`, no desktop-specific layouts yet.

## Current Pages & Components

| Route | Type | Description |
|---|---|---|
| `/` | Server | Redirect to dashboard or login |
| `/login` | Client | Login form |
| `/register` | Client | Register form |
| `/dashboard` | Server | Stats summary + last 10 matches |
| `/matches/new` | Client | New match form |
| `/matches/[id]` | Server | Match detail with event list |
| `/matches/[id]/log` | Client (`GameLog.tsx`) | Live game logging with modal entry form |
| `/matches/[id]/report` | Server | Printable official match report |
| `/profile` | Server + Client (`ProfileForm.tsx`) | Profile & password management |

**Shared components:**
- `components/JerseyColorPicker.tsx` — searchable color picker dropdown
- `app/matches/[id]/MatchReportActions.tsx` — export actions (PDF, CSV, email)
- `app/matches/[id]/report/PrintButton.tsx` — print trigger

## Backlog (identified gaps)

1. **No `/matches` list page** — dashboard has a "View all →" link to `/matches` but no page exists there
2. **No supplemental report UI** — backend has full CRUD but no frontend for viewing, editing, or submitting supplemental reports
3. **No match list filter UI** — backend supports filtering by role, ageGroup, competitionLevel, date range, and text search; no UI exposes any of it
4. **`MatchReportActions` references unimplemented APIs** — `/api/matches/[id]/pdf`, `/api/matches/[id]/arbiter`, and `/api/matches/[id]/email` don't exist yet (backend work needed too)
5. **Duplicated utilities across files** — `minuteLabel`, `PERIOD_LABELS`, and `EVENT_EMOJI` are copy-pasted across `GameLog.tsx`, `[id]/page.tsx`, and `report/page.tsx`; should be extracted to a shared lib
6. **Dashboard queries DB directly** — inconsistent with other pages that go through the API; a refactor to use `GET /api/matches` would make the dashboard filterable/testable
7. **No loading/skeleton states** — buttons show "Saving..." text but no visual placeholders for async data
8. **No error boundaries** — client-side errors in complex components (GameLog) would render blank without feedback
9. **Dashboard limited to 10 matches** — no way to browse older matches without the missing `/matches` page
10. **No PWA manifest file** — `layout.tsx` references `/manifest.json` but the file doesn't appear to exist

## Branch Rule
Always create a new git branch before making any code changes.
