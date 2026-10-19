# Perfect Template

Template production-ready com Clean Architecture: Next.js 16 + React 19 no
frontend, Express 5 + TypeScript + Prisma 7 no backend.

> **Usar como template:** clica em **Use this template** no GitHub (ou faz fork)
> e segue o [SETUP.md](./SETUP.md). Os segredos em `.env.example` são
> placeholders — gera os teus antes de arrancar.

## Features

### Core
- Clean Architecture (Domain, Application, Infrastructure, Presentation)
- Dependency Injection com TSyringe
- Prisma ORM com MySQL (adapter MariaDB)
- API versionada em `/api/v1`
- Validação com Zod

### Security
- Auth por cookies httpOnly + CSRF double-submit
- Access token de 15 min, refresh token opaco de 7 dias com rotação
- Deteção de reutilização de refresh token (revoga a sessão)
- Recuperação/reset de password com token de uso único
- Login blocker (conta + IP) e rate limiting
- Helmet, CORS whitelist, sanitização de input
- Criptografia AES-256-GCM para campos em repouso (extensão Prisma)
- Uploads com validação de tipo, nomes UUID e proteção contra path traversal

### Realtime & Frontend
- Hub SSE por utilizador + hook `useSseStream`
- Design tokens, dark mode e UI Kit em `/kit`
- PWA baseline (manifest, service worker, ícones)
- Diagnóstico frontend → `/diagnostics/client-log`

### Observability
- Health checks (`/health`, `/health/ready`, `/health/live`)
- Prometheus metrics (`/metrics`)
- Correlation IDs e logging estruturado com Pino
- Auditoria de ações de autenticação

### Developer Experience
- OpenAPI em `docs/openapi.yaml`
- Vitest (unit) e Playwright (e2e)
- Pre-commit hooks (Husky)
- Seed e helpers de base de dados
- Docker multi-stage + Docker Compose
- CI/CD com GitHub Actions

## Quick Start

```bash
# 1. Base de dados
docker compose up -d mysql

# 2. Backend
cd backend
cp .env.example .env
# Gera segredos e edita o .env (ver SETUP.md):
#   openssl rand -base64 64   -> JWT_SECRET
#   openssl rand -hex 32      -> ENCRYPTION_KEY
npm install
npm run db-update
npm run dev

# 3. Frontend (noutro terminal)
cd frontend
cp .env.example .env.development
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- UI Kit: http://localhost:3000/kit

Ou tudo com Docker:

```bash
docker compose up -d --build
```

## Estrutura

```
├── backend/
│   ├── prisma/schema.prisma   # User, Session, PasswordResetToken, CronLock
│   ├── src/modules/           # auth, user, diagnostics, realtime
│   ├── src/shared/            # container, middleware, storage, services
│   └── src/config/            # env, cookies, security, metrics
├── frontend/
│   └── src/
│       ├── app/               # /, /login, /forgot-password, /reset-password, /kit
│       ├── components/        # ui/ e feature/
│       ├── hooks/             # useApi, useSseStream
│       └── libs/              # fetchClient, clientLogger
├── docs/openapi.yaml
└── docker-compose.yml
```

## Endpoints

### Operacionais (root)
- `GET /health`, `/health/ready`, `/health/live`
- `GET /metrics`

### API v1
- `POST /api/v1/auth/login`
- `GET  /api/v1/auth/me`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/stream-token`
- `POST /api/v1/auth/recover-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/user`
- `POST /api/v1/uploads`
- `GET  /uploads/...`
- `POST /api/v1/diagnostics/client-log`
- `GET  /api/v1/realtime/stream`

Detalhes em [API.md](./API.md) e [docs/openapi.yaml](./docs/openapi.yaml).

## Scripts

### Backend

```bash
npm run dev          # hot reload
npm run build        # prisma generate → testes → lint → tsc → copia client
npm start            # arranca dist
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run db-update    # prisma generate + db push
npm run db-seed      # seed
npm run lint
```

### Frontend

```bash
npm run dev
npm run build        # testes + next build
npm start
npm run lint
```

## Environment

Backend (`.env`):

| Variável | Obrigatória | Notas |
| --- | --- | --- |
| `DATABASE_URL` + `DATABASE_USER/PASSWORD/NAME/HOST/PORT` | sim | Adapter MariaDB lê as variáveis separadas |
| `JWT_SECRET` | sim | Mínimo 64 caracteres |
| `ENCRYPTION_KEY` | sim | Exatamente 64 caracteres hex |
| `FRONT_URL` | sim | CORS e links de email |
| `EMAIL`, `EMAIL_PASS`, `IP_SERVER`, `BUSINESS_NAME` | não | Email; sem isto a recuperação falha e fica no log |
| `DEV_EMAIL` | não | Redireciona emails fora de produção |
| `UPLOAD_DIR`, `LOG_DIR` | não | Defaults `<cwd>/uploads` e `<cwd>/logs/front` |

Frontend (`.env.development` / `.env.production`):

| Variável | Notas |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Origem do backend, sem `/api/v1`; é inlined no build |

## Documentação

- [ARCHITECTURE.md](./ARCHITECTURE.md) — módulos, auth, SSE, storage, design system
- [API.md](./API.md) — endpoints, cookies, erros, limites
- [SETUP.md](./SETUP.md) — setup detalhado
- [DEPLOYMENT.md](./DEPLOYMENT.md) — deploy manual/Docker
- [SECURITY.md](./SECURITY.md) — política de segurança
- [docs/runbook.md](./docs/runbook.md) — operações
- [docs/openapi.yaml](./docs/openapi.yaml) — especificação OpenAPI
- [knowledge.md](./knowledge.md) — convenções do projeto

## Tecnologias

- Node.js 24+, Express 5, TypeScript 5, Prisma 7, MySQL 8, Pino
- Next.js 16, React 19, Tailwind CSS 4, React Hook Form
- Vitest, Playwright, Docker, GitHub Actions, Husky

## License

MIT
