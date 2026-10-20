# AGENTS.md

Instruções para agentes de AI a trabalhar neste repositório. **Lê este ficheiro
antes de alterar código.** Aplica-se a Codex, Claude Code, Cursor, Copilot,
Gemini CLI, Windsurf, Kiro e equivalentes.

## Fonte de verdade

Em caso de conflito, esta é a ordem:

1. `AGENTS.md` — regras operacionais e limites.
2. `knowledge.md` — convenções detalhadas e filosofia *Ponytail*.
3. `ARCHITECTURE.md` — desenho dos módulos e fluxos.
4. `API.md` + `docs/openapi.yaml` — contrato HTTP.
5. `SETUP.md` / `DEPLOYMENT.md` / `docs/runbook.md` — operação.

`.kiro/steering/` é material de apoio e pode estar desatualizado. Se
contradizer este ficheiro, ganha este ficheiro.

## O que é o projeto

Template full-stack production-ready:

- **Backend:** Express 5, TypeScript, Prisma 7 + MySQL, TSyringe, Zod, Pino.
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4.
- **Arquitetura:** Clean Architecture por módulo (Domain → Application →
  Infrastructure → Presentation).
- **Filosofia:** Ponytail — mínimo código, nada especulativo, mudanças
  cirúrgicas. Lê `knowledge.md` antes de propor abstrações.

## Contexto universal (OpenCode + MCP)

- **OpenCode** lê `AGENTS.md` nativamente. [`opencode.jsonc`](./opencode.jsonc)
  carrega `knowledge.md` em `instructions` e regista o servidor MCP.
- [`tools/mcp-context/`](./tools/mcp-context/) é um servidor **MCP read-only**
  (stdio, zero dependências) que expõe `AGENTS.md`, `knowledge.md`,
  `ARCHITECTURE.md`, `API.md`, OpenAPI, setup, deploy, runbook e mais, através
  de ferramentas (`project_overview`, `get_rules`, `list_docs`, `read_doc`,
  `search_docs`), recursos `project://…` e prompts.
- Registos incluídos: `.mcp.json` (Claude Code / Copilot portátil),
  `.cursor/mcp.json` (Cursor) e `opencode.jsonc` (OpenCode). Para VS Code
  nativo, Windsurf, Cline, Roo Code, Continue ou uma extensão própria, vê
  `tools/mcp-context/README.md`.
- **DeepCode** (extensão VS Code + bridge) lê o `.mcp.json` da raiz
  nativamente e expõe as ferramentas como `project-context:project_overview`,
  `project-context:get_rules`, etc. O chat web recebe ainda `AGENTS.md`/`CLAUDE.md`/
  `USER_RULES.md` via `get_project_rules`.
- **DeepSeek**: é apenas o modelo. No OpenCode está no catálogo — define
  `DEEPSEEK_API_KEY` e escolhe `deepseek/deepseek-v4-flash` (ou usa `/connect`).
  No DeepCode não há API key: o IDE liga-se ao chat web do DeepSeek. Nunca
  commitar API keys.
- O servidor MCP só lê a allowlist; não acede a `.env`, uploads, logs,
  `dist`, `node_modules` nem ficheiros gerados.

## Comandos

```bash
# Backend
cd backend
npm install
npm run dev            # nodemon
npm run build          # prisma generate → vitest → eslint → tsc → postbuild
npm test               # vitest (unit; sem DB)
npm run test:e2e       # Playwright (precisa de DB/servidor)
npm run lint
npm run db-update      # prisma generate + db push
npm run db-seed

# Frontend
cd frontend
npm install
npm run dev
npm run build          # vitest → next build
npm test
npm run lint
```

Regras:

- Node **24+** (`.nvmrc`).
- Não corras `tsc` isolado para produzir deploy: o `postbuild` copia o client
  Prisma para `dist/generated`.
- Testes unitários não podem depender de MySQL; o setup injeta env fictícias.
- Fluxos reais de auth/DB precisam de MySQL e `.env` configurado.

## Estrutura

```
backend/src/
├── modules/{auth,user,diagnostics,realtime}/
│   ├── application/{dtos,usecases}/
│   ├── domain/{entities,errors,repositories,services}/
│   ├── infrastructure/{repositories,services}/
│   └── presentation/{controllers,routes}/
├── shared/{container,middleware,storage,services,cron,utils}/
├── config/                  # env, cookies, CORS, security, metrics
├── lib/prisma.ts            # Prisma client + extensão de encriptação
├── app.ts                   # Express wiring (sem listen)
└── index.ts                 # setupContainer() antes de importar app

frontend/src/
├── app/                     # /, /login, /forgot-password, /reset-password, /kit
├── components/{ui,feature}/
├── context/                 # AuthContext, ThemeContext
├── hooks/                   # useApi, useSseStream
├── libs/                    # fetchClient, clientLogger
├── services/                # authApi
└── types/, validators/, utils/
```

## Arquitetura — regras

- Dependências apontam para dentro: Presentation → Application → Domain ←
  Infrastructure. Domain não faz I/O.
- Um módulo novo segue `backend/MODULE_TEMPLATE.md` e regista bindings em
  `shared/container/modules/<modulo>.container.ts`, tokens em
  `shared/container/tokens/<modulo>.tokens.ts` e o controller em
  `shared/container/controllers.ts`.
- Rotas são finas: `authMiddleware`/`csrfMiddleware` quando aplicável,
  `validate(schema)`, controller, `ApiResponse`.
- Erros estendem `AppError` e têm `code` estável. O cliente decide pelo `code`,
  não pela `message`.
- Usa `asyncHandler`, `logger.error({ err }, 'mensagem')` (Pino) e nunca
  `console.log`.
- TypeScript: `strict`, sem `any`, interfaces para objetos; prefere named
  exports.
- Não introduzas dependências novas sem justificação; reutiliza o que existe.
- Mudanças cirúrgicas: não refactorizes código adjacente nem “melhores”
  ficheiros que não fazem parte do pedido.

## Auth e segurança — não negociável

- Transporte por **cookies httpOnly**. Nunca `localStorage`, nunca
  `Authorization: Bearer`.
- `access_token` (JWT, 15 min, path `/`), `refresh_token` (opaco, 7 dias, path
  `/api/v1/auth`), `csrf_token` (legível, double-submit).
- Refresh roda em cada uso; reutilização de um token antigo revoga a sessão.
- Métodos inseguros exigem `X-CSRF-Token` igual ao cookie `csrf_token`.
- Não cries rotas que aceitem o token de `scope: "realtime"` fora do SSE.
- Password reset: token de uso único, 2 h, revoga todas as sessões; respostas de
  recuperação são genéricas (anti-enumeração).
- Nunca logues passwords, tokens, cookies ou segredos.
- Rate limits e `LoginBlockerService` existem por um motivo: não os contornes.
- Erros 500 devolvem mensagem genérica; detalhes só no log com
  `correlationId`.
- `.env` nunca é commitado; `.env.example` só com placeholders.
- `ENCRYPTION_KEY` = 64 hex. AES-256-GCM. Campos únicos usados em lookups não
  podem ser encriptados sem blind index.
- Uploads: nomes UUID, allowlist de extensões, `resolveSafePath`, `nosniff` e
  `Content-Disposition: attachment` para tipos ativos.

## Frontend — regras

- Todo o HTTP passa por `fetchClient` (`@/libs/fetchClient`): prefixo `/api/v1`,
  cookies, CSRF, refresh em 401, retry em 403 e `ApiError.code`.
- Nunca uses `fetch` direto para a API nem cries `EventSource` fora de
  `useSseStream`.
- `AuthContext` restaura a sessão com `authApi.restoreSession()`; não dupliques
  lógica de refresh.
- UI usa tokens semânticos (`bg-surface`, `text-muted`, `border-border`), não
  cinzas Tailwind crus. Consulta `/kit` e `globals.css`.
- `useSearchParams` exige `<Suspense>` (App Router).
- PWA: o service worker não cacheia `/api`, `/uploads` nem métodos não-GET.
- Componentes pequenos, funcionais, named exports; sem `any`.

## Dados e Prisma

- Importa o client de `src/generated/prisma/client` (caminho relativo), nunca de
  `@prisma/client`.
- O schema tem `User`, `Session`, `PasswordResetToken`, `CronLock`. Mantém
  índices/unique coerentes com as queries.
- `ENCRYPTED_FIELDS` está vazio por omissão (pass-through). Só atives depois de
  garantir que lookups/unique continuam a funcionar.
- Jobs agendados usam `runExclusiveCron` + `CronLock`.

## Realtime / SSE

- O hub é in-process (`RealtimeHub`), heartbeat de 25 s.
- Eventos usam `message` padrão com `{ type, ... }` no JSON; não inventes nomes
  de eventos.
- `compression` deve continuar a excluir `text/event-stream`.
- Para várias réplicas, o hub precisa de Redis pub/sub ou sticky sessions.

## Testes

- Lógica não trivial deixa um teste pequeno ao lado (`*.spec.ts`/`*.spec.tsx`).
- Backend: Vitest; `tests/setup.ts` fornece env fictícias. Não exijas DB em
  testes unitários.
- Frontend: Vitest + Testing Library; mocks de `fetch`/`EventSource`.
- E2E: Playwright, separado (`npm run test:e2e`).

## Definition of done

1. `cd backend && npm run build` verde.
2. `cd frontend && npm run build` e `npm run lint` verdes.
3. Sem segredos, `.env`, `node_modules`, `dist`, `.next`, `src/generated`,
   uploads/logs ou `*.tsbuildinfo` no diff.
4. Se mudaste comportamento/contrato, atualiza `API.md`, `ARCHITECTURE.md`,
   `knowledge.md` e/ou `docs/openapi.yaml`.
5. Mudanças de env documentadas em `backend/.env.example` e `SETUP.md`.
6. Se mexeste no servidor MCP: `cd tools/mcp-context && npm test`.

## Nunca

- Fazer force-push para `main`, reescrever histórico ou apagar trabalho alheio.
- Commitar segredos, chaves, tokens ou ficheiros de estado local.
- Adicionar features, abstrações ou “flexibilidade” que não foram pedidas.
- Trocar cookies/CSRF por Bearer/localStorage.
- Expor detalhes internos de erros ou dados sensíveis em respostas.
- Ignorar os rate limits, a rotação de refresh ou a revogação de sessões.
- Fazer refactors grandes “pelo caminho” ou alterar formatação alheia.

## Onde ler mais

| Tema | Ficheiro |
| --- | --- |
| Convenções completas + Ponytail | `knowledge.md` |
| Visão de arquitetura e fluxos | `ARCHITECTURE.md` |
| Endpoints, cookies, erros | `API.md`, `docs/openapi.yaml` |
| Setup local | `SETUP.md` |
| Deploy e HTTPS | `DEPLOYMENT.md` |
| Operação, backups, SSE atrás de proxy | `docs/runbook.md` |
| Criar um módulo | `backend/MODULE_TEMPLATE.md` |
| Contexto MCP / editores | `tools/mcp-context/README.md` |
| Guias detalhados (apoio) | `.kiro/steering/` |
