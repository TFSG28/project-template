# Architecture Documentation

## Clean Architecture Overview

Dependencies flow inward:

```
Presentation → Application → Domain ← Infrastructure
```

- **Domain**: entities, repository/service interfaces, domain errors. No I/O.
- **Application**: use cases and DTOs. Orchestrates domain + interfaces.
- **Infrastructure**: Prisma repositories, JWT, mail, storage, encryption.
- **Presentation**: controllers, routes, validation, cookies.

`shared/` holds cross-cutting infrastructure (errors, middleware, logger,
storage, mail, crypto, cron). `config/` parses env and third-party setup.

## Backend Structure

```
src/
├── modules/
│   ├── auth/           # login, refresh rotation, reset, sessions
│   ├── user/           # user entity/repository/use case
│   ├── diagnostics/    # frontend error ingestion
│   └── realtime/       # SSE hub
├── shared/
│   ├── container/      # tsyringe composition root + tokens
│   ├── middleware/     # auth, CSRF, validation, errors, encryption
│   ├── storage/        # local attachments + path traversal guards
│   ├── services/       # mail, encryption, transactions
│   ├── cron/           # exclusive cron lock helpers
│   └── utils/          # logger, health, duration, concurrency, html
├── config/             # env, CORS, cookies, security, metrics, cache
├── cron/               # scheduled jobs (auth cleanup)
├── lib/prisma.ts       # Prisma client + encryption extension
├── app.ts              # Express wiring (no listen)
└── index.ts            # boot: DI first, then app, HTTP server, shutdown
```

### Composition root

`index.ts` calls `setupContainer()` **before** importing `app`, because route
modules resolve controllers from the container at import time. Each module
registers bindings in `shared/container/modules/<module>.container.ts`.
`shared/container/controllers.ts` is the only facade routes import.

### Module layout

```
modules/<feature>/
├── application/
│   ├── dtos/
│   └── usecases/
├── domain/
│   ├── entities/
│   ├── errors/
│   ├── repositories/
│   └── services/
├── infrastructure/
│   ├── repositories/
│   └── services/
└── presentation/
    ├── controllers/
    └── routes/
```

## Authentication

Cookie-based, with no token in `localStorage`:

| Cookie | Content | TTL | Path |
| --- | --- | --- | --- |
| `access_token` | JWT (`userId`, `email`) | 15 min | `/` |
| `refresh_token` | `<sessionId>.<secret>` (opaque) | 7 days | `/api/v1/auth` |
| `csrf_token` | random hex (readable) | 7 days | `/` |

- The DB stores only a **bcrypt hash** of the refresh secret.
- Every `/auth/refresh` rotates the secret. A mismatch on an active session is
  treated as token theft and revokes the session.
- `Logout` does not require a valid access token; the refresh cookie capability
  plus CSRF is enough to revoke and clear.
- Password reset uses a random 32-byte hex token stored in DB with a 2-hour
  expiry, deleted on use. A successful reset deactivates all user sessions.
- Login failures are counted in memory per email (5/15 min) and per IP (50/15
  min), with a dummy bcrypt comparison for unknown emails to reduce timing
  enumeration. `ponytail:` swap for Redis when running multiple replicas.
- `GET /auth/stream-token` issues a 15-minute JWT with `scope: "realtime"`.
  `authMiddleware` rejects that scope; only the SSE controller accepts it.

CSRF is a stateless double-submit check: `X-CSRF-Token` must equal the
`csrf_token` cookie on unsafe methods.

## Encryption at rest

`shared/services/encryption.service.ts` implements AES-256-GCM with
`iv:authTag:ciphertext` (hex). `ENCRYPTION_KEY` must be 64 hex characters.

The Prisma extension in `shared/middleware/encryption.middleware.ts` is a
pass-through until models/fields are listed in `ENCRYPTED_FIELDS`. Fields used
in unique lookups should stay unencrypted (or use a deterministic blind index);
otherwise lookups break.

## Storage

`shared/storage/LocalAttachmentStorage.service.ts` writes to `UPLOAD_DIR`
(default `<cwd>/uploads`). Security properties:

- UUID filenames; original names only in the response.
- `sanitizeSubdir` / `sanitizeSegment` remove traversal segments.
- `resolveSafePath` normalizes and rejects anything outside the root.
- Executables/HTML/SVG are rejected at upload.
- `/uploads` is served with `nosniff`; non-previewable extensions get
  `Content-Disposition: attachment`.

`ponytail:` local disk is single-instance. For multi-replica deployments use a
shared volume or replace the service with R2/S3 (same interface).

## Realtime (SSE)

`RealtimeHub` keeps `Map<userId, Set<Response>>`, writes a `retry: 5000` hint,
a `connected` event, and a 25-second comment heartbeat. `publishToUser()` emits
default `message` events with the type inside JSON, so the client does not need
to know event names in advance.

`app.ts` excludes `text/event-stream` from `compression()` because gzip buffers
small events and makes the stream look dead. Nginx needs buffering disabled;
the response sends `X-Accel-Buffering: no`.

## Observability

- **Pino** structured logs (`logger.error({ err }, 'msg')`).
- **Prometheus** at `/metrics`; request metrics + correlation IDs.
- **Health**: `/health` (DB + memory), `/health/ready`, `/health/live`.
- **Auth audit**: `AuthLoggerService` records login success/failure, blocked
  attempts, refresh failures, password resets (without secrets).
- **Frontend diagnostics**: `DiagnosticsBridge` catches global errors and
  posts to `/diagnostics/client-log`; backend appends sanitized lines to
  `LOG_DIR/<userId>.log`.

## Frontend Structure

```
src/
├── app/                 # App Router pages (/, /login, /forgot-password,
│                        # /reset-password, /kit), manifest.ts
├── components/
│   ├── ui/              # Button, TextInput, Select, Modal, Skeleton,
│   │                    # Badge, Spinner
│   └── feature/         # LoginForm, ThemeToggle, DiagnosticsBridge,
│                        # RealtimeBridge, PwaRegister
├── context/             # AuthContext, ThemeContext
├── hooks/               # useApi, useSseStream
├── libs/                # fetchClient, clientLogger
├── services/            # authApi
├── types/               # User, ApiEnvelope
└── validators/
```

### Data flow

```
Component → context/hook → authApi → fetchClient → /api/v1
```

`fetchClient` owns:

- `credentials: 'include'`
- automatic `/api/v1` prefix
- CSRF header on unsafe methods
- single-flight refresh on `401`
- one CSRF retry on `403`
- `ApiError` with the backend `code`
- `uploadWithProgress` via XHR (fetch has no upload progress)

`AuthContext` restores the session with a raw `/auth/me` request. If the access
token expired but the refresh cookie is valid, `authApi.restoreSession()` calls
`/auth/refresh` once and retries, without triggering the client's redirect
interceptor.

## Design system

Tokens live in `app/globals.css` as CSS variables (`--background`, `--surface`,
`--border`, `--accent`, `--success`, `--warning`, `--danger`, …) mapped into
Tailwind with `@theme inline`. Dark mode is class-based (`.dark`). Components
use semantic classes (`bg-surface`, `text-muted`, `border-border`) instead of
raw grays. `/kit` is a living reference page.

## PWA baseline

- `app/manifest.ts` generates the manifest.
- `public/sw.js` caches the app shell and content-hashed static assets;
  it never touches `/api`, `/uploads`, or non-GET requests.
- `PwaRegister` registers the worker in production only.
- Icons are in `public/icons/` (192, 512, maskable 512).

## Database & Prisma

- Prisma 7 with `@prisma/adapter-mariadb` using split `DATABASE_*` vars.
- Client is generated to `src/generated/prisma` (ignored by git).
- `tsc` does not emit the generated JS, so `postbuild` copies
  `src/generated` to `dist/generated`. The Docker image and CI bundle ship that
  directory; the production image does not need the Prisma CLI.
- Session and password-reset cleanup runs daily at 03:00 through
  `runExclusiveCron` + `CronLock` (DB lease) and an in-process overlap guard.

## Testing

- **Vitest** unit tests: use cases, utils, encryption, storage, SSE hub, login
  blocker, controllers.
- `backend/vitest.config.ts` excludes `dist`, `src/generated`, and Playwright
  e2e specs.
- **Playwright** e2e tests run separately (`npm run test:e2e`).
- **React Testing Library** for components and hooks.
- Backend test setup supplies dummy env defaults so unit tests do not need a
  real `.env` or database. DB-backed tests still need MySQL.

## Deployment

### Backend

```bash
npm ci
npm run build        # prisma generate → test → lint → tsc → copy generated
npm start
```

Set `DATABASE_*`, `JWT_SECRET` (≥64 chars), `ENCRYPTION_KEY` (64 hex),
`FRONT_URL`, and optionally `EMAIL`/`EMAIL_PASS`/`IP_SERVER`/`BUSINESS_NAME`.
Mount `UPLOAD_DIR` and `LOG_DIR` when running in a container.

### Frontend

```bash
npm ci
NEXT_PUBLIC_API_URL=https://api.example.com npm run build
npm start
```

`NEXT_PUBLIC_API_URL` is inlined at build time. `output: "standalone"` is enabled
for the CI/cPanel artifact; Docker uses the standard `.next` build.

### HTTPS

`NODE_ENV=production` sets `secure: true` on auth cookies. Local plain-HTTP
compose runs with `NODE_ENV=development`; production must be behind HTTPS.
