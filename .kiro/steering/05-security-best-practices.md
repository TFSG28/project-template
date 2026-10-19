---
inclusion: auto
---

# Práticas de Segurança

Guia de segurança que deve ser seguido em TODAS as implementações.

## Validação de Entrada

### SEMPRE Valide

```typescript
// ✅ BOM - Validação com DTO
export class CreateUserDto {
  name: string;
  email: string;
  password: string;

  validate() {
    if (!this.name || this.name.length < 3) {
      throw new InvalidDataError('Nome inválido');
    }
    if (!this.email || !this.email.includes('@')) {
      throw new InvalidDataError('Email inválido');
    }
    if (!this.password || this.password.length < 6) {
      throw new InvalidDataError('Senha muito curta');
    }
  }
}

// ❌ RUIM - Sem validação
const user = await prisma.user.create({
  data: req.body, // Perigoso!
});
```

## Autenticação

### Cookies, refresh e CSRF

```typescript
// ✅ BOM - Rotas protegidas usam o cookie httpOnly access_token
router.get('/protected', authMiddleware, controller.method);

// ✅ BOM - Métodos inseguros exigem CSRF
router.post('/protected', authMiddleware, csrfMiddleware, controller.method);

// ❌ RUIM - Sem auth/CSRF
router.post('/protected', controller.method);
```

- `access_token`: JWT de 15 min, httpOnly.
- `refresh_token`: opaco, 7 dias, path `/api/v1/auth`, rodado em cada uso.
- Reutilização de refresh antigo revoga a sessão.
- `csrf_token` é legível e enviado em `X-CSRF-Token`; nunca uses Bearer ou
  `localStorage`.

### Hash de Senhas

```typescript
// ✅ BOM - Hash com bcrypt e custo configurável
import bcrypt from 'bcryptjs';
import { PASSWORD_SALT_ROUNDS } from '../auth.constants';

const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

// ❌ RUIM - Senha em texto plano
const user = await prisma.user.create({
  data: { password: password } // Nunca faça isso!
});
```

## Autorização

### Verificar Role

```typescript
// ✅ BOM - Verificar permissão
if (user.role !== 'ADMIN') {
  return res.status(403).json({ message: 'Sem permissão' });
}

// ❌ RUIM - Sem verificação
await prisma.user.delete({ where: { id } });
```

## Proteção de Dados

### NUNCA Exponha Senhas

```typescript
// ✅ BOM - Excluir senha
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
    // password não incluído
  },
});

// ❌ RUIM - Retorna tudo
const user = await prisma.user.findUnique({ where: { id } });
return res.json(user); // Inclui password!
```

### Mensagens de Erro Seguras

```typescript
// ✅ BOM - Mensagem genérica
catch (error) {
  console.error('Erro:', error); // Log interno
  return res.status(500).json({ 
    message: 'Erro interno do servidor' 
  });
}

// ❌ RUIM - Expõe detalhes
catch (error) {
  return res.status(500).json({ 
    message: error.message, // Pode expor informações sensíveis
    stack: error.stack // Nunca exponha stack trace!
  });
}
```

## SQL Injection

### Use Prisma Corretamente

```typescript
// ✅ BOM - Prisma protege automaticamente
const user = await prisma.user.findUnique({
  where: { email: userEmail },
});

// ❌ RUIM - Query raw sem sanitização
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userEmail}
`;
```

## CORS

```typescript
// ✅ BOM - CORS configurado
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// ❌ RUIM - CORS aberto
app.use(cors()); // Permite qualquer origem!
```

## Rate Limiting

```typescript
// ✅ BOM - Rate limit configurado
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições
});

app.use('/api/', limiter);
```

## Variáveis de Ambiente

```typescript
// ✅ BOM - Usar variáveis de ambiente validadas
import { env } from '@/config/env';
const secret = env.JWT_SECRET;

// ❌ RUIM - Hardcoded
const secret = 'minha-senha-secreta'; // Nunca!
```

`JWT_SECRET` tem de ter ≥64 caracteres e `ENCRYPTION_KEY` exatamente 64 hex.
Nunca commites `.env`; usa `.env.example` com placeholders.

## Checklist de Segurança

- [ ] Validação de entrada implementada
- [ ] Senhas com hash (bcrypt + `PASSWORD_SALT_ROUNDS`)
- [ ] Cookies httpOnly + CSRF em métodos inseguros
- [ ] Refresh rotativo e revogação de sessão
- [ ] Senhas nunca retornadas em responses
- [ ] Mensagens de erro genéricas (sem SQL/stack)
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativado
- [ ] Variáveis de ambiente validadas (sem segredos hardcoded)
- [ ] SQL injection prevenido (use Prisma)
- [ ] Uploads com allowlist e anti-path-traversal
- [ ] HTTPS em produção (cookies `secure`)
- [ ] Logs de segurança sem tokens/passwords

## Recursos

- Consulte `auth.middleware.ts` para exemplo de autenticação
- Consulte `cors.config.ts` para configuração de CORS
- Consulte DTOs para exemplos de validação
