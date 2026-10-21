# API Documentation

## Base URL

```
http://localhost:3001/api/v1
```

Root operational endpoints (`/health`, `/health/ready`, `/health/live`,
`/metrics`) are **not** under `/api/v1`.

## Authentication

Authentication is cookie-based. The API never accepts a Bearer token from
`localStorage`.

On login the server sets:

| Cookie | httpOnly | Path | Lifetime | Purpose |
| --- | --- | --- | --- | --- |
| `access_token` | yes | `/` | 15 min | Short-lived JWT used by API routes |
| `refresh_token` | yes | `/api/v1/auth` | 7 days | Opaque rotating refresh token |
| `csrf_token` | no | `/` | 7 days | Double-submit CSRF token |

Send requests with `credentials: 'include'`. For unsafe methods
(`POST`/`PUT`/`PATCH`/`DELETE`) echo the CSRF token in `X-CSRF-Token`:

```
X-CSRF-Token: <csrfToken>
```

The frontend `fetchClient` handles cookies, the `/api/v1` prefix, CSRF headers,
single-flight access-token refresh on `401`, and CSRF retry on `403`.

### Refresh rotation

`POST /auth/refresh` rotates the refresh token on every call. The server stores
only a bcrypt hash of the secret and revokes the whole session if an already
rotated token is reused. A password reset also revokes every session.

## Response Envelope

Success:

```json
{ "status": "success", "data": { } }
```

Error:

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Dados inválidos",
  "errors": { "body.email": "Email inválido" }
}
```

Clients should branch on `code`, not on the translated `message`.

Stable error codes (verified by `node scripts/check-docs.mjs`; every code used
in the backend must appear here):

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Body/query invalid (details in `errors`). |
| `INVALID_RESET_TOKEN` | 400 | Password-reset token invalid, used or expired. |
| `INVALID_UPLOAD` | 400 | Upload rejected (extension/path/size or active content). |
| `UNAUTHORIZED` | 401 | Missing/invalid auth. |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token unknown, rotated or revoked (session dropped). |
| `FORBIDDEN` | 403 | Authenticated but not allowed (e.g. role check). |
| `NOT_FOUND` | 404 | Resource does not exist. |
| `USER_ALREADY_EXISTS` | 409 | Duplicate user (email). |
| `CONFLICT` | 409 | Generic conflict. |
| `TOO_MANY_ATTEMPTS` | 429 | Rate limit / login blocker triggered. |
| `MAIL_SEND_FAILED` | 500 | Outgoing email failed server-side. |
| `INTERNAL_ERROR` | 500 | Generic server error (details only in logs). |

## Endpoints

### Health & metrics (root)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Detailed health (database + memory). `503` when the DB is down. |
| GET | `/health/ready` | Readiness probe (database query). |
| GET | `/health/live` | Liveness probe (process only). |
| GET | `/metrics` | Prometheus metrics. |

`GET /api/v1/health` also exists as a lightweight API-level check.

### Auth

#### POST `/auth/login`

```json
{ "email": "user@example.com", "password": "password123" }
```

Sets the three cookies and returns the user plus a CSRF token:

```json
{
  "status": "success",
  "data": {
    "user": { "id": "uuid", "name": "User Name", "email": "user@example.com" },
    "csrfToken": "a1b2c3…"
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `429 TOO_MANY_ATTEMPTS`.
Rate limit: 20 requests / 15 min / IP, plus an in-memory account/IP blocker
(5 failures per email, 15 min window).

#### GET `/auth/me`

Requires `access_token`. Returns the authenticated user.

#### POST `/auth/refresh`

Uses the `refresh_token` cookie, rotates it, and re-issues the access/CSRF
cookies. No request body. Returns `{ csrfToken }`. `401` when the session is
missing, expired, revoked, or reuses an old secret.

#### POST `/auth/logout`

Requires `X-CSRF-Token` and the `refresh_token` cookie. The access token may
already be expired; logout still revokes the session and clears all cookies.

#### GET `/auth/stream-token`

Requires `access_token`. Returns a 15-minute JWT with `scope: "realtime"`,
used only by the SSE endpoint. It cannot be used as an access token.

#### POST `/auth/recover-password`

```json
{ "email": "user@example.com" }
```

Always returns a generic message (anti-enumeration). Sends a link valid for
2 hours to `FRONT_URL/reset-password?token=…` when the account exists and mail
is configured. Rate limit: 5 requests / hour / IP.

#### POST `/auth/reset-password`

```json
{ "token": "reset-token", "password": "new-password" }
```

Consumes the single-use token, updates the password, revokes all sessions, and
clears the current cookies. Minimum password length: 8.

### Users

#### POST `/user`

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

Returns `201` with the created user. `409 USER_ALREADY_EXISTS` when the email
is taken.

### Uploads

#### POST `/uploads`

Requires `access_token` + `X-CSRF-Token`, `multipart/form-data`, field `file`.
Maximum size: 25 MB. Executables, HTML, SVG, and similar active content are
rejected. Files are stored under `UPLOAD_DIR` (default `<cwd>/uploads`) in a
per-user directory.

```json
{
  "status": "success",
  "data": {
    "url": "/uploads/users/<userId>/<uuid>.png",
    "filename": "photo.png",
    "size": 12345,
    "contentType": "image/png"
  }
}
```

Public files are served from `GET /uploads/...` with `X-Content-Type-Options:
nosniff`. Non-previewable types are sent as `Content-Disposition: attachment`.

> With multiple backend replicas, use shared storage (volume/R2/S3) or a user
> may download a file from a replica that does not have it.

### Diagnostics

#### POST `/diagnostics/client-log`

Requires `access_token`. Rate limit: 60 requests / min / user.

```json
{
  "level": "error",
  "message": "Unhandled error",
  "context": { "source": "app.js", "line": 42 },
  "userAgent": "Mozilla/5.0 …"
}
```

`level` is `error` or `warn`. The backend appends a sanitized line to
`LOG_DIR/<userId>.log` (default `<cwd>/logs/front`). The frontend bridge sends
global `error`/`unhandledrejection` events and deduplicates bursts.

### Realtime (SSE)

#### GET `/realtime/stream?token=<stream-token>`

`EventSource` cannot set headers reliably, so the short-lived stream token goes
in the query string. The response is `text/event-stream` (excluded from gzip)
with a 25-second heartbeat. Every event is a default `message` with the type in
the JSON payload:

```
data: {"type":"notification","message":"Olá"}
```

The frontend `useSseStream` hook requests a fresh token for each (re)connection.
The hub is in-process; with multiple replicas, publish through Redis pub/sub or
use sticky connections.

## Status Codes

| Code | Meaning |
| --- | --- |
| 200 | Success |
| 201 | Created |
| 204 | No content |
| 400 | Validation / business rule |
| 401 | Missing, expired, or invalid auth |
| 403 | CSRF or permission failure |
| 404 | Not found |
| 409 | Conflict (e.g. duplicate email) |
| 413 | Upload too large |
| 429 | Rate limited / login blocked |
| 500 | Internal error |

## Rate Limits

- Global: 200 requests / 10 min / IP.
- Login: 20 / 15 min / IP (plus account/IP failure blocker).
- Password recovery/reset: 5 / hour / IP.
- Client diagnostics: 60 / min / user.

Rate-limit responses use `code: "TOO_MANY_ATTEMPTS"` (or the global limiter's
`error` message).

## cURL Examples

```bash
# Login and keep cookies
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"password123"}'

# Authenticated request
curl http://localhost:3001/api/v1/auth/me -b cookies.txt

# Create user
curl -X POST http://localhost:3001/api/v1/user \
  -H "Content-Type: application/json" \
  -d '{"name":"User Name","email":"user@example.com","password":"password123"}'

# Upload (CSRF token from the login response)
curl -X POST http://localhost:3001/api/v1/uploads \
  -b cookies.txt \
  -H "X-CSRF-Token: <csrfToken>" \
  -F "file=@photo.png"
```

## OpenAPI

The full specification is in [`docs/openapi.yaml`](./docs/openapi.yaml).
