# Copilot instructions

Leia **`AGENTS.md`** (fonte de verdade), `knowledge.md` e `ARCHITECTURE.md`
antes de sugerir alterações.

Regras essenciais:

- Node 24+. Backend: `npm run build` (prisma generate → testes → lint → tsc →
  postbuild). Frontend: `npm run build` + `npm run lint`.
- Clean Architecture por módulo; rotas finas; erros com `code` estável.
- Auth por cookies httpOnly + CSRF com refresh rotativo. Não uses
  Bearer/localStorage.
- Todo o HTTP do frontend passa por `fetchClient`; SSE só por `useSseStream`.
- Prisma é gerado em `src/generated/prisma` (nunca importar `@prisma/client`).
- Não commits `node_modules`, `dist`, `.next`, `src/generated`, `.env`,
  uploads/logs ou `*.tsbuildinfo`.
- Mudanças cirúrgicas e sem dependências novas sem justificação.
