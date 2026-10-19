'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/services/authApi';
import { Button } from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    async function submit() {
        setError(null);

        if (password.length < 8) {
            setError('A password deve ter pelo menos 8 caracteres');
            return;
        }
        if (password !== confirmation) {
            setError('As passwords não coincidem');
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword(token, password);
            setDone(true);
            setTimeout(() => router.push('/login'), 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao alterar a password');
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <div className="flex flex-col gap-4 text-center">
                <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm">
                    Link inválido. Pede um novo email de recuperação.
                </p>
                <Button href="/forgot-password">Pedir novo link</Button>
            </div>
        );
    }

    if (done) {
        return (
            <div role="status" className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
                Password alterada. A redirecionar para o login…
            </div>
        );
    }

    return (
        <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                void submit();
            }}
        >
            <TextInput
                label="Nova password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
            />
            <TextInput
                label="Confirmar password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                error={error ?? undefined}
                disabled={loading}
            />
            <Button type="submit" isLoading={loading}>Definir password</Button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-16">
            <div className="text-center">
                <h1 className="title2">Definir nova password</h1>
                <p className="mt-2 text-sm text-muted">
                    O link é de uso único e expira ao fim de 2 horas.
                </p>
            </div>

            <Suspense fallback={<p className="text-center text-sm text-muted">A carregar…</p>}>
                <ResetPasswordForm />
            </Suspense>

            <Link className="text-center text-sm underline underline-offset-4 hover:text-foreground" href="/login">
                Voltar ao login
            </Link>
        </main>
    );
}
