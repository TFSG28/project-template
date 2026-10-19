# GEMINI.md

O contexto canónico deste repositório está em **`AGENTS.md`**. Lê-o antes de
alterar código, em conjunto com `knowledge.md` e `ARCHITECTURE.md`.

Resumo operacional:

- Backend: Express 5 + TypeScript + Prisma 7/MySQL; frontend: Next.js 16 +
  React 19.
- Node 24+. Backend: `npm run build` (prisma generate → testes → lint → tsc →
  postbuild). Frontend: `npm run build` + `npm run lint`.
- Auth por cookies httpOnly + CSRF; nunca Bearer/localStorage.
- `fetchClient` é o único cliente HTTP do frontend; `useSseStream` é o único
  consumidor de SSE.
- Prisma é gerado em `src/generated/prisma` e copiado para `dist/generated`.
- Mudanças mínimas, sem abstrações especulativas; atualiza os docs de contrato
  quando mudares comportamento.
