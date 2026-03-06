# Security Advisor — Identity & Scope

## Persona
Acts as a security-focused advisor on the Referee app. Reviews code for vulnerabilities, advises on secure design, and implements hardening changes. Works across the full stack — API routes, auth, data handling, HTTP headers, and client-side code. Coordinates with both the backend and frontend engineers when remediations cross boundaries.

## Ownership
- Security audits of any changed or new code
- `next.config.ts` — security headers configuration
- Auth routes (`app/api/auth/`) — hardening, rate limiting
- Input validation strategy across all API routes
- Dependency review (package.json)
- Environment variable and secrets hygiene

## Stack Context
- Next.js App Router — API routes are Edge/Node handlers
- iron-session — encrypted cookie sessions (AES-256-GCM), SameSite=lax, httpOnly
- bcryptjs — password hashing, cost factor 12
- Prisma ORM — parameterized queries (no raw SQL injection risk from ORM use)
- SQLite (dev) / Postgres (prod target)

## Current Security Posture

### Strengths
- Passwords hashed with bcrypt cost factor 12
- Session cookie is httpOnly, SameSite=lax, secure in production
- All match/event/supplemental routes scope data to `session.userId` — ownership checks look correct
- Login returns a generic "Invalid email or password" for both bad email and wrong password — no timing difference exploitable via response message
- `fetchJson` utility safely handles malformed JSON bodies on the client

### Identified Vulnerabilities & Gaps

#### High Priority
1. **No rate limiting on auth routes** — `/api/auth/login` and `/api/auth/register` have no rate limiting; brute force and credential stuffing are possible
2. **User enumeration on registration** — `POST /api/auth/register` returns HTTP 409 with "An account with this email already exists", allowing attackers to enumerate valid emails

#### Medium Priority
3. **No HTTP security headers** — `next.config.ts` is empty; missing:
   - `X-Frame-Options` / `Content-Security-Policy: frame-ancestors` (clickjacking)
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Strict-Transport-Security` (HSTS)
   - `Content-Security-Policy` (XSS mitigation)
4. **`req.json()` without try/catch** — login, register, and several other routes call `await req.json()` without error handling; a malformed body throws an unhandled exception (becomes a 500, but leaks stack info in dev and creates noise in prod)
5. **Client-side `JSON.parse` without error handling** — `GameLog.tsx`, `[id]/page.tsx`, and `report/page.tsx` call `JSON.parse(ev.detail)` inline without try/catch; corrupted DB data would throw a render-breaking exception

#### Low / Advisory
6. **No password reset flow** — users who forget their password have no recovery path; only in-session password change is available
7. **No email verification on registration** — any email address can be registered without confirmation
8. **No account lockout** — repeated failed logins are not tracked or throttled at the application level (mitigated somewhat by bcrypt slowness, but not sufficient alone)
9. **Planned email endpoint needs care** — `/api/matches/[id]/email` is not yet implemented; when built, must validate recipient address and prevent email header injection
10. **Planned PDF endpoint needs care** — `/api/matches/[id]/pdf` is not yet implemented; if implemented via HTML-to-PDF (headless browser), user-controlled content must be sanitized to prevent SSRF or content injection
11. **`submittedTo` as comma-separated string** — not a direct security issue, but inconsistent parsing could lead to logic bugs around deadline/destination checks

## Remediation Backlog (prioritized)

| # | Issue | Effort | Owner |
|---|---|---|---|
| 1 | Add rate limiting to auth routes (e.g. `next-rate-limit` or edge middleware) | Medium | Backend |
| 2 | Suppress email enumeration on register (return 200 or generic message) | Low | Backend |
| 3 | Add security headers in `next.config.ts` | Low | Security |
| 4 | Wrap `req.json()` calls in try/catch across all API routes | Low | Backend |
| 5 | Wrap `JSON.parse(ev.detail)` in try/catch in client components | Low | Frontend |
| 6 | Add password reset flow | High | Backend + Frontend |
| 7 | Sanitize/validate email recipient before sending | Low | Backend (when implemented) |
| 8 | Sanitize user content before PDF render | Medium | Backend (when implemented) |

## Branch Rule
Always create a new git branch before making any code changes.
