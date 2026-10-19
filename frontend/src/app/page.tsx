'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const { user, loading, logout } = useAuth();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-24">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted">Perfect Template</p>
        <h1 className="title">Next.js + Express</h1>
        <p className="max-w-xl text-lg text-muted">
          Clean Architecture, cookies httpOnly, CSRF, SSE em tempo real e um
          pequeno design system pronto a crescer.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {user ? (
          <>
            <span className="rounded-full border border-border bg-surface-2 px-4 py-2 text-sm">
              Sessão de <strong>{user.name}</strong>
            </span>
            <Button variant="secondary" onClick={() => void logout()}>Sair</Button>
          </>
        ) : (
          <Button href="/login" disabled={loading}>
            {loading ? 'A verificar sessão…' : 'Entrar'}
          </Button>
        )}
        <Button variant="secondary" href="/kit">Ver UI Kit</Button>
      </div>

      <nav className="flex flex-wrap gap-4 text-sm text-muted">
        <Link className="underline underline-offset-4 hover:text-foreground" href="/login">Login</Link>
        <Link className="underline underline-offset-4 hover:text-foreground" href="/forgot-password">Recuperar password</Link>
        <Link className="underline underline-offset-4 hover:text-foreground" href="/kit">Componentes</Link>
      </nav>
    </main>
  );
}
