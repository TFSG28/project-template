# Setup Guide

## Quick Start

### 1. Database

```bash
docker compose up -d mysql
```

(or install MySQL 8 locally and create the database/user).

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Generate the secrets and paste them into `.env`:

```bash
openssl rand -base64 64   # JWT_SECRET (>= 64 chars)
openssl rand -hex 32      # ENCRYPTION_KEY (exactly 64 hex chars)
```

Minimum `.env`:

```env
DATABASE_URL="mysql://user:password@localhost:3306/perfect_template"
DATABASE_USER="user"
DATABASE_PASSWORD="password"
DATABASE_NAME="perfect_template"
DATABASE_HOST="localhost"
DATABASE_PORT=3306

JWT_SECRET="<openssl rand -base64 64>"
ENCRYPTION_KEY="<openssl rand -hex 32>"

FRONT_URL="http://localhost:3000"
PORT=3001
NODE_ENV=development

# Optional (password recovery email). Without it the API still starts.
IP_SERVER="smtp.example.com"
EMAIL="user@example.com"
EMAIL_PASS="password"
BUSINESS_NAME="Perfect Template"
# DEV_EMAIL="dev@example.com"
```

Push the schema and start:

```bash
npm run db-update
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.development
npm run dev
```

`.env.development`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

`NEXT_PUBLIC_API_URL` is inlined into the browser bundle at build time; it must
not include the `/api/v1` suffix (the client adds it).

## Creating a New Module

```
modules/[feature]/
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

1. Define domain entities, interfaces, and typed errors.
2. Add DTOs (Zod) and use cases.
3. Implement repositories/services in infrastructure.
4. Add controller + routes (thin; delegate to use cases).
5. Register bindings in `shared/container/modules/<module>.container.ts` and
   tokens in `shared/container/tokens/<module>.tokens.ts`.
6. Resolve the controller in `shared/container/controllers.ts`.
7. Mount routes in `shared/routes/index.ts`.

See [MODULE_TEMPLATE.md](./backend/MODULE_TEMPLATE.md) and
[knowledge.md](./knowledge.md) for the conventions.

## Database

```bash
npm run db-update    # prisma generate + db push
npm run db-seed
```

The Prisma client is generated to `src/generated/prisma` (git-ignored). The
`postbuild` script copies it to `dist/generated`; run `npm run build` instead of
bare `tsc` when producing a deployable `dist`.

## Production Build

### Backend

```bash
npm run build
npm start
```

### Frontend

```bash
NEXT_PUBLIC_API_URL="https://api.example.com" npm run build
npm start
```

## Environment Variables

### Backend (`.env`)

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | no | `production` sets `secure: true` on cookies |
| `PORT` | no | Default `3001` |
| `DATABASE_URL` | yes | Connection string used by Prisma |
| `DATABASE_USER` / `PASSWORD` / `NAME` / `HOST` / `PORT` | yes | MariaDB adapter reads these separately |
| `JWT_SECRET` | yes | At least 64 characters |
| `ENCRYPTION_KEY` | yes | 64 hex characters (AES-256-GCM) |
| `FRONT_URL` | yes | CORS origin + email links |
| `IP_SERVER` | no | SMTP host (name kept for compatibility) |
| `EMAIL` / `EMAIL_PASS` | no | Enables email sending |
| `DEV_EMAIL` | no | Non-production email redirect |
| `BUSINESS_NAME` | no | Sender/template name |
| `UPLOAD_DIR` | no | Default `<cwd>/uploads` |
| `LOG_DIR` | no | Default `<cwd>/logs/front` |
| `PASSWORD_SALT_ROUNDS` | no | bcrypt cost, default `12` |

### Frontend (`.env.development` / `.env.production`)

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend origin, no `/api/v1`, inlined at build |
