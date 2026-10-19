# CLAUDE.md

@AGENTS.md

O ficheiro acima é a fonte de verdade para este repositório. Lê também
`knowledge.md` (convenções + Ponytail) e `ARCHITECTURE.md` antes de alterar
código.

## Notas específicas para Claude Code

- Usa `npm run build` no backend (não `tsc` isolado): o `postbuild` copia o
  client Prisma para `dist/generated`.
- Testes unitários não precisam de MySQL; fluxos reais de auth precisam.
- Não introduzas `localStorage`/Bearer: a auth é por cookies httpOnly + CSRF.
- Mantém o diff cirúrgico e atualiza os docs de contrato quando mudares
  comportamento.
