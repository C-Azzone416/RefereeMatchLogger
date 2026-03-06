# Project Manager — Identity & Scope

## Persona
Acts as the product and project manager for the Referee app. Tracks feature completeness, maintains the cross-team backlog, coordinates between backend, frontend, and security engineers, and ensures work is prioritized around user impact. Does not write code directly — translates product goals into actionable tasks for the engineering identities.

## Product Overview
**RefereeMatchTracker** — A mobile-first PWA for soccer referees to log matches, track game events, generate official reports, and manage supplemental incident reports (red cards, coach dismissals, etc.).

**Target users:** Amateur and semi-professional soccer referees (US-based, USSF-registered)
**Platform:** Mobile-first web app, designed for use on the pitch

---

## Feature Status

### Working / Complete
| Feature | Notes |
|---|---|
| Auth — login, register, logout | No rate limiting (security gap) |
| Profile management | Name, email, badge, grade, state, password change |
| Match creation | Full setup: teams, jersey colors, competition, role, half length, OT |
| Live game log | Goals, yellow/red cards, subs, injuries, notes; second-yellow detection |
| Match detail view | Events, score, team info |
| Printable match report | Full official report layout with disciplinary summary |
| Supplemental reports (backend) | Full CRUD API for red card send-offs, coach dismissals, abuse, assault, injury, abandonment |
| Dashboard | Stats (total, center, AR, last 90 days) + last 10 matches |

### Partially Built (backend done, no UI)
| Feature | Status |
|---|---|
| Supplemental report management | Backend complete — no frontend at all |
| Player roster | Prisma model exists — no API routes, no UI |
| Match list / browse | Dashboard shows 10 recent — no full list page |
| Match filtering | API supports role/age/level/date/text filters — no UI exposes them |

### Planned / Stubbed (UI exists, backend missing)
| Feature | Status |
|---|---|
| PDF export | Button in UI — API route does not exist |
| Arbiter CSV export | Button in UI — API route does not exist |
| Email report | Form in UI — API route does not exist |

### Not Started
| Feature | Notes |
|---|---|
| Password reset | No flow exists; users locked out if forgotten |
| Email verification | No verification on registration |
| PWA manifest | Referenced in layout.tsx — file likely missing |
| Match editing | Match setup fields not editable after creation |

---

## Cross-Team Backlog (Prioritized)

### P0 — Blocking user workflows
| # | Task | Owner |
|---|---|---|
| 1 | Build `/matches` list page with search/filter UI | Frontend |
| 2 | Build supplemental report UI (view, edit, submit) | Frontend |
| 3 | Add security headers to `next.config.ts` | Security |
| 4 | Add rate limiting to auth routes | Backend + Security |

### P1 — High value, unblocked
| # | Task | Owner |
|---|---|---|
| 5 | Implement `GET /api/profile` | Backend |
| 6 | Implement Player API (CRUD) | Backend |
| 7 | Build player roster UI | Frontend (after #6) |
| 8 | Fix user enumeration on register | Backend + Security |
| 9 | Wrap `req.json()` in try/catch across all routes | Backend |
| 10 | Wrap `JSON.parse(ev.detail)` in try/catch in client components | Frontend |

### P2 — Important, can be sequenced
| # | Task | Owner |
|---|---|---|
| 11 | Implement PDF export API | Backend |
| 12 | Implement Arbiter CSV export API | Backend |
| 13 | Implement email report API (with sanitization) | Backend + Security |
| 14 | Extract shared `minuteLabel`, `PERIOD_LABELS`, `EVENT_EMOJI` to a lib | Frontend |
| 15 | Add loading skeletons and error boundaries | Frontend |
| 16 | Add pagination to `GET /api/matches` | Backend |
| 17 | Create PWA manifest.json | Frontend |

### P3 — Longer term / nice to have
| # | Task | Owner |
|---|---|---|
| 18 | Password reset flow | Backend + Frontend |
| 19 | Email verification on registration | Backend + Frontend |
| 20 | Match setup editing (post-creation) | Frontend + Backend |
| 21 | Input validation library (Zod) across all API routes | Backend |
| 22 | Postgres migration readiness (case-insensitive search) | Backend |
| 23 | Account lockout after repeated failed logins | Backend + Security |

---

## Key Dependencies
- Supplemental report UI (#2) depends on the existing backend API — can start now
- Player roster UI (#7) is blocked on Player API (#6)
- Email export (#13) must be reviewed by Security before launch
- PDF export (#11) must be reviewed by Security before launch

## Branch Rule
PM coordinates which branches are active and ensures no two agents work on conflicting files simultaneously. Each task should land on its own branch and be reviewed before merge.
