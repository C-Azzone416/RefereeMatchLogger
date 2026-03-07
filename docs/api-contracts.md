# API Contracts

Cross-agent reference for API request/response shapes. Updated by the backend engineer when routes change.

---

## Auth

### `POST /api/auth/register`

**Request**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "badgeNumber": "string (optional)",
  "currentGrade": "string (optional, defaults to 'Grassroots')",
  "state": "string (optional)"
}
```

**Response — success (200)**
```json
{ "ok": true, "emailVerified": false }
```
No session is started. User must verify email before they can log in.

**Response — email already in use (409)**
```json
{ "error": "An account with this email already exists" }
```

---

### `POST /api/auth/login`

**Request**
```json
{ "email": "string", "password": "string" }
```

**Response — success (200)**
```json
{ "ok": true }
```

**Response — unverified user (403)**
```json
{
  "error": "Please verify your email before logging in. Check your inbox (and junk folder) for the verification code.",
  "emailVerified": false
}
```
Show inline prompt with code entry field and resend link. Remind user to check junk folder.

**Response — bad credentials (401)**
```json
{ "error": "Invalid email or password" }
```

---

### `POST /api/auth/verify-email`

**Request**
```json
{ "email": "string", "code": "string (6-digit)" }
```

**Response — success (200)**
```json
{ "ok": true }
```
Session is started. Redirect to dashboard.

**Response — wrong code (400)**
```json
{ "error": "Incorrect code. 2 attempts remaining." }
```

**Response — too many attempts (400)**
```json
{ "error": "Too many incorrect attempts. Please request a new code.", "tooManyAttempts": true }
```
Disable the code input and show resend link.

**Response — expired code (400)**
```json
{ "error": "Verification code has expired. Please request a new one.", "expired": true }
```
Show resend link.

---

### `POST /api/auth/resend-verification`

**Request**
```json
{ "email": "string" }
```

**Response — success (200)**
```json
{ "ok": true }
```
Always returns 200 even if email not found (prevents enumeration).

**Response — rate limited (429)**
```json
{ "error": "Please wait 42 seconds before requesting another code." }
```
Show countdown or just display the error message.

---

### `POST /api/auth/logout`

No request body. Clears session cookie.

**Response (200)**
```json
{ "ok": true }
```

---

## Match Export

### `POST /api/matches/[id]/export/email`

Sends the match report to a specified email address. Auth required. All user-supplied content is HTML-escaped before inclusion in the email body.

**Request**
```json
{ "to": "string (valid email, required)" }
```

**Response — success (200)**
```json
{ "ok": true }
```

**Response — invalid email (400)**
```json
{ "error": "Invalid email address" }
```

**Response — match not found / not owned by session user (404)**
```json
{ "error": "Not found" }
```

**Note for frontend:** `MatchReportActions.tsx` currently calls `/api/matches/${matchId}/email`. This path needs to be updated to `/api/matches/${matchId}/export/email`.
