# RefereeMatchLogger

A mobile-first web app for non-professional US Soccer referees to log matches, track game events, and generate match and supplemental reports — built with the upgrade program in mind.

## What it does

- **Game log** — tap-to-log goals, cards, substitutions, injuries, and notes during a match. Auto-detects the correct period from the minute entered. Second yellow automatically triggers a red card with a confirmation step.
- **Match reports** — print-ready match report with full event log, score, half-time score, and post-match narrative.
- **Supplemental reports** — auto-created draft for every red card. Tracks send-offs, coach dismissals, referee abuse/assault, serious injuries, and match abandonment. Supports submission to WYS, WPL, WASA, USSF, and email destinations with deadline tracking.
- **Match history** — filterable list with 30-day default window. Filter by role, age group, competition level, or search by team name, coach, venue, or competition.
- **Profile** — stores badge number, referee grade, and state association.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database | SQLite via Prisma ORM (PostgreSQL migration path ready) |
| Auth | iron-session (cookie-based, 30-day sessions) |
| Styling | Tailwind CSS with custom brand green and pitch-bg utility |
| Passwords | bcryptjs (cost factor 12) |

## Getting started

**Prerequisites:** Node.js 18+, npm

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local — set DATABASE_URL and SESSION_SECRET

# Run database migrations
DATABASE_URL="file:///absolute/path/to/prisma/dev.db" npx prisma migrate dev

# Seed a test user (test@referee.local / password123)
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

```env
DATABASE_URL="file:///absolute/path/to/your/repo/prisma/dev.db"
SESSION_SECRET="at-least-32-characters-random-string"
```

> **Note:** Prisma requires an absolute path for the SQLite URL in this project.

## API overview

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |

### Profile
| Method | Route | Description |
|---|---|---|
| PATCH | `/api/profile` | Update name, email, badge, grade, state, password |

### Matches
| Method | Route | Description |
|---|---|---|
| GET | `/api/matches` | List matches — defaults to last 30 days. Supports `role`, `ageGroup`, `competitionLevel`, `dateFrom`, `dateTo`, `q` query params |
| POST | `/api/matches` | Create a match |
| GET | `/api/matches/[id]` | Match detail with events and supplemental summary |
| PATCH | `/api/matches/[id]` | Update scores, narrative, abandon status, ET/PK flags |
| DELETE | `/api/matches/[id]` | Delete a match |

### Events
| Method | Route | Description |
|---|---|---|
| POST | `/api/matches/[id]/events` | Log an event. Red cards auto-create a draft supplemental report. Returns `{ ...eventFields, supplemental }` |
| DELETE | `/api/matches/[id]/events` | Delete an event by `eventId` in body |

### Supplemental reports
| Method | Route | Description |
|---|---|---|
| GET | `/api/matches/[id]/supplementals` | List all supplemental reports for a match, each with computed `deadline` |
| POST | `/api/matches/[id]/supplementals` | Create a supplemental report manually |
| GET | `/api/matches/[id]/supplementals/[reportId]` | Get a single report |
| PATCH | `/api/matches/[id]/supplementals/[reportId]` | Update report — narrative, status, submission destinations, structured details |
| DELETE | `/api/matches/[id]/supplementals/[reportId]` | Delete a report |

## Match model — key fields

| Field | Type | Notes |
|---|---|---|
| `halfLength` | Int (default 45) | Minutes per half — used by game log for period auto-detection |
| `overtimePossible` | Boolean (default false) | When false, ET and penalty shootout periods are hidden |
| `homeHeadCoach` / `awayHeadCoach` | String? | Searchable via `?q=` on the list endpoint |
| `supplementalReports` | Relation | Cascades on match delete |

## Supplemental report statuses

- `draft` — auto-created, incomplete
- `complete` — narrative filled, marked done. Requires `narrative` to transition.

Submission deadlines by governing body: WYS 24hr, WPL 48hr, WASA 24hr, USSF 24hr.

## Branching

| Branch prefix | Owner | Purpose |
|---|---|---|
| `backend/*` | Backend agent | API routes, schema, migrations, lib |
| `ui/*` | UI agent | Pages, components, styles |
| `main` | Both | Merged, stable code |

PRs from feature branches into `main` — coordinate before merging to avoid conflicts on shared files (`prisma/schema.prisma`, `app/api/`).

## Washington state specifics

Supplemental reports are submitted via:
- **WYS / WPL** — Ridgestar online portal (24hr / 48hr deadlines)
- **WASA** — email to league/assignor (24hr)
- **USSF** — US Soccer reporting system

The app tracks deadline urgency per destination and surfaces pending report counts on the match detail page.
