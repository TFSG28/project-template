# ADR 003: Prisma como ORM

## Status
Aceito

## Contexto
Precisávamos de uma solução para:
- Type-safe database access
- Migrations gerenciáveis
- Boa developer experience
- Performance

## Decisão
Escolhemos Prisma porque:
- Type safety completo
- Schema declarativo
- Migrations automáticas
- Excelente autocomplete
- Suporte a múltiplos bancos

## Consequências

### Positivas
- Zero SQL injection risk
- Autocomplete em queries
- Migrations versionadas
- Ótima documentação

### Negativas
- Abstração pode esconder complexidade
- Queries muito complexas podem ser difíceis
- Tamanho do client gerado

## Alternativas Consideradas
- TypeORM (mais maduro, menos type-safe)
- Sequelize (menos type-safe)
- Knex.js (mais controle, menos abstração)
- Raw SQL (máximo controle, sem type safety)

## Configuração
```prisma
generator client {
    provider = "prisma-client-js"
    output   = "../src/generated/prisma"
}

datasource db {
    provider = "mysql"
    url      = env("DATABASE_URL")
}
```
