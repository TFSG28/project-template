---
inclusion: manual
---

# Padrões de Banco de Dados

Guia para trabalhar com Prisma e banco de dados.

## Schema do Prisma

O schema real está em `backend/prisma/schema.prisma` e usa **MySQL**. O client é
gerado em `src/generated/prisma` (nunca importar `@prisma/client`).

```prisma
model User {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  name     String
  email    String  @unique
  password String
  isActive Boolean @default(true)

  sessions            Session[]
  passwordResetTokens PasswordResetToken[]

  @@index([id])
  @@index([email])
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  refreshToken String   @unique // hash bcrypt; nunca o token em claro
  isActive     Boolean  @default(true)
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  lastUsedAt   DateTime @default(now())
  ipAddress    String?
  userAgent    String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@index([isActive])
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model CronLock {
  id        String   @id @default(uuid())
  name      String   @unique
  owner     String?
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([expiresAt])
}
```

Não existe `Workspace` nem `Role` no template base. Se adicionares roles ou
multi-tenancy, é uma alteração de domínio que precisa de schema, auth e
testes próprios — não a assumas como existente.

## Queries Eficientes

### Selecionar Apenas Campos Necessários

```typescript
// ✅ BOM
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
  },
});

// ❌ RUIM - Seleciona tudo
const user = await prisma.user.findUnique({ where: { id } });
```

### Evitar N+1 Queries

```typescript
// ✅ BOM - Uma query com os campos necessários
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
});

// ❌ RUIM - N+1 queries
const sessions = await prisma.session.findMany();
for (const session of sessions) {
  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });
}
```

## Transações

```typescript
// ✅ BOM - Usar transação para operações múltiplas
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: userData,
  });
  
  await tx.log.create({
    data: {
      action: 'USER_CREATED',
      userId: user.id,
    },
  });
});

// ❌ RUIM - Operações separadas
const user = await prisma.user.create({ data: userData });
await prisma.log.create({ data: logData }); // Pode falhar
```

## Verificações

```typescript
// ✅ BOM - Verificar existência
const user = await prisma.user.findUnique({ where: { id } });
if (!user) {
  throw new UserNotFoundError();
}

await prisma.user.update({
  where: { id },
  data: updateData,
});

// ❌ RUIM - Sem verificação
await prisma.user.update({
  where: { id },
  data: updateData,
}); // Pode falhar silenciosamente
```

## Unique Constraints

```typescript
// ✅ BOM - Verificar antes de criar
const existing = await prisma.user.findUnique({
  where: { email },
});

if (existing) {
  throw new UserAlreadyExistsError();
}

const user = await prisma.user.create({ data });
```

## Migrations

```bash
# Criar migration
npx prisma migrate dev --name add_user_table

# Aplicar migrations
npx prisma migrate deploy

# Gerar client
npx prisma generate

# Push schema (desenvolvimento)
npx prisma db push
```

## Comandos Úteis

```bash
# Atualizar banco (desenvolvimento)
npm run db-update

# Abrir Prisma Studio
npx prisma studio

# Resetar banco (cuidado!)
npx prisma migrate reset
```

## Recursos

- Consulte `schema.prisma` para modelos existentes
- Consulte repositórios para exemplos de queries
- [Documentação Prisma](https://www.prisma.io/docs)
