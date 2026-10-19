# Changelog

## [Unreleased]

Melhorias de autenticação, storage, tempo real e frontend inspiradas no `omni`,
mantendo a filosofia *Ponytail* do template (mínimo código, módulos opcionais).

### Auth (endurecimento)
- Access token JWT reduzido para 15 min; refresh token opaco de 7 dias com
  rotação a cada uso e deteção de reutilização (revoga a sessão).
- Novos modelos `Session`, `PasswordResetToken` e `CronLock`.
- Recuperação e reset de password (token de uso único, 2 h, revoga sessões).
- `LoginBlockerService` em memória (conta + IP) com comparação bcrypt "dummy"
  para reduzir enumeração por timing.
- Auditoria de auth (`AuthLoggerService`), rate limits dedicados e
  `GET /auth/stream-token` (JWT curto com `scope: realtime`).
- `AppError.code` estável em todas as respostas; `errorHandler` nunca expõe
  detalhes internos e regista o `correlationId`.

### Storage & criptografia
- Storage local de anexos (`UPLOAD_DIR`, máx. 25 MB), nomes UUID, rejeição de
  conteúdo ativo e proteção contra path traversal.
- `POST /api/v1/uploads` + serviço de `/uploads` com `nosniff` e
  `Content-Disposition: attachment` para tipos não seguros.
- AES-256-GCM para campos em repouso via extensão Prisma (pass-through até
  `ENCRYPTED_FIELDS` ser configurado).

### Tempo real, DX e frontend
- Hub SSE por utilizador (heartbeat 25 s), exclusão de `text/event-stream` do
  gzip e hook `useSseStream`.
- Diagnóstico frontend → `POST /diagnostics/client-log`.
- UI kit + design tokens (claro/escuro) e página `/kit`.
- PWA baseline (manifest, service worker, ícones).
- `fetchClient` único (`/api/v1`, cookies, CSRF, refresh em 401, retry 403,
  `ApiError.code`); utilidades `mapWithConcurrency`, `parseDurationToMs`,
  `escapeHtml`; `runExclusiveCron` + `CronLock` (cleanup de auth às 03:00).

### Infra
- `prisma generate` no início do `build` + `postbuild` copia o client gerado
  para `dist`; `prisma.config.ts` já não exige `DATABASE_URL` para gerar.
- CI `quality-mcp` valida o servidor MCP em cada push/PR.
- Dockerfile de produção sem Prisma CLI; `docker-compose` com variáveis
  `DATABASE_*`, segredos, volumes de uploads/logs e build arg
  `NEXT_PUBLIC_API_URL`; `output: "standalone"` no Next.
- Restantes: `.env.example` (backend + frontend), `API.md`, `ARCHITECTURE.md`,
  `README.md`, `SETUP.md`, `DEPLOYMENT.md`, `docs/runbook.md`, `docs/openapi.yaml`.

### Contexto para agentes de AI
- `AGENTS.md` canónico (comandos, arquitetura, auth, frontend, testes,
  definition of done) + adapters para Claude Code, Gemini CLI, Copilot, Cursor,
  Windsurf e Kiro.
- `opencode.jsonc` para OpenCode: `AGENTS.md` nativo, `knowledge.md` em
  `instructions` e servidor MCP.
- `.deepcode/settings.json` para Deep Code (CLI + extensão VS Code), que lê
  `AGENTS.md` nativamente e expõe as ferramentas como
  `mcp__project-context__*`.
- Servidor MCP read-only (`tools/mcp-context/`, stdio, zero dependências) com
  `project_overview`, `get_rules`, `list_docs`, `read_doc`, `search_docs`,
  recursos `project://…` e prompts. Registos em `.mcp.json` e
  `.cursor/mcp.json`; documentação para VS Code, Windsurf, Cline/Roo Code,
  Continue e extensões próprias (incluindo DeepSeek).
- `.agents/` (estado local) passa a estar ignorado.

## [1.0.0] - 2026-03-26

### Added
- Complete testing setup with Vitest
- Test scripts in package.json (test, test:watch, test:coverage)
- Example test files for backend and frontend
- Comprehensive TESTING.md guide for junior developers
- Test coverage reporting with v8
- Tests run automatically before production builds
- Coverage folders added to .gitignore

### Backend Testing
- Unit test example: `CreateUser.usecase.spec.ts`
- Integration test example: `user.controller.spec.ts`
- Vitest configuration with Node environment
- Supertest for API endpoint testing
- Global test setup file

### Frontend Testing
- Component test example: `Button.spec.tsx`
- Hook test example: `useApi.spec.ts`
- Vitest configuration with jsdom environment
- React Testing Library integration
- Global test setup file

### Dependencies Added

**Backend:**
- `vitest` - Testing framework
- `@vitest/coverage-v8` - Coverage reporting
- `supertest` - HTTP assertion library
- `@types/supertest` - TypeScript types

**Frontend:**
- `vitest` - Testing framework
- `@vitest/coverage-v8` - Coverage reporting
- `@vitejs/plugin-react` - React support for Vitest
- `jsdom` - DOM implementation for testing
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - Custom matchers
- `@testing-library/user-event` - User interaction simulation

### Build Process
- Backend: `npm run build` now runs tests → lint → prisma generate → tsc
- Frontend: `npm run build` now runs tests → next build
- Build fails if any test fails (production safety)

### Documentation
- TESTING.md with complete guide for beginners
- AAA pattern examples (Arrange, Act, Assert)
- Mocking patterns and best practices
- Common assertions reference
- Troubleshooting section
