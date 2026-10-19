---
inclusion: manual
---

# Desenvolvimento Frontend

Guia para o frontend Next.js 16 (App Router) + React 19. A fonte de verdade é
`AGENTS.md`; para o desenho geral, `ARCHITECTURE.md`.

## Estrutura

```
src/
├── app/                     # rotas, layout, manifest.ts
├── components/
│   ├── ui/                  # Button, TextInput, Select, Modal, Skeleton,
│   │                        # Badge, Spinner, Tooltip, CloseBtn, HeaderBtn
│   └── feature/             # LoginForm, ThemeToggle, ProtectedPage,
│                            # DiagnosticsBridge, RealtimeBridge,
│                            # PwaRegister, Loading, Tooltip
├── context/                 # AuthContext, ThemeContext
├── hooks/                   # useApi, useSseStream
├── libs/                    # fetchClient, clientLogger
├── services/                # authApi
├── types/, validators/, utils/
```

Componentes são funcionais, pequenos e com uma responsabilidade. Prefere named
exports (o `TextInput` é default export por compatibilidade).

## Design tokens

Os tokens estão em `app/globals.css` (variáveis CSS + `@theme inline`) e mudam
com a classe `.dark`:

- superfícies: `bg-background`, `bg-surface`, `bg-surface-2`
- texto: `text-foreground`, `text-muted`
- bordas: `border-border`, `border-border-strong`
- ação: `bg-accent`, `text-accent-foreground`, `hover:bg-accent-hover`
- estados: `text-success`, `text-warning`, `text-danger`

Não uses cinzas Tailwind crus (`bg-gray-100`, `text-gray-600`) em UI nova.
Consulta `/kit` para o padrão visual e `Button.tsx`/`Badge.tsx` para variantes.

## Dados e API

Todo o HTTP passa por `fetchClient` (`@/libs/fetchClient`):

- prefixa `/api/v1` automaticamente;
- envia cookies (`credentials: 'include'`);
- adiciona `X-CSRF-Token` em métodos inseguros;
- renova a sessão em `401` e repete uma vez em `403` de CSRF;
- expõe `ApiError` com `code`.

```tsx
import { fetchClient } from '@/libs/fetchClient';

const response = await fetchClient.get('/auth/me');
const { data } = await response.json();
```

Nunca uses `fetch`/`axios` diretamente para a API. Para estado de pedido, usa
`useApi`:

```tsx
const { execute, loading, error, data } = useApi();
await execute('get', '/user');
```

## Auth

`AuthContext` (`useAuth`) expõe `user`, `loading`, `login`, `logout` e restaura a
sessão com `authApi.restoreSession()`. Não guardes tokens em `localStorage` e
não dupliques refresh/CSRF — isso é responsabilidade do `fetchClient`.

```tsx
const { user, login } = useAuth();
await login(email, password);
```

## Realtime (SSE)

Usa apenas `useSseStream`; ele pede um token curto a `/auth/stream-token` e
reconecta sozinho:

```tsx
useSseStream({
  enabled: Boolean(user),
  onMessage: (event) => {
    if (event.type === 'notification') console.log(event.message);
  },
});
```

Não cries `new EventSource` noutro sítio nem coloques o access token no URL.

## Páginas e formulários

- Páginas que usam `useSearchParams` precisam de `<Suspense>`.
- Formulários: estado local/`react-hook-form`, validação com os validadores de
  `src/validators`, erros junto ao campo e erro geral no topo.
- Mostra `loading` com `Spinner`/`Skeleton` e não faças `console.log` de erros:
  o `DiagnosticsBridge` já captura `error`/`unhandledrejection`.
- Componentes de cliente levam `'use client'`; não transformes tudo em client
  component sem necessidade.

## PWA

`app/manifest.ts` gera o manifest; `public/sw.js` faz cache do app shell e de
assets estáticos. Regras:

- não cachear `/api`, `/uploads` nem métodos não-GET;
- o registo (`PwaRegister`) só acontece em produção;
- ao mudar o shell, sobe a versão do cache em `sw.js`.

## Testes

- Vitest + Testing Library em `*.spec.tsx` ao lado do componente.
- Mocka `fetch`/`EventSource`; não faças chamadas reais.
- Para páginas, testa estados de loading, erro e sucesso.
- `npm test` e `npm run lint` antes de terminar; `npm run build` valida o App
  Router e o TypeScript.
