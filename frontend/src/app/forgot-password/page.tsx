'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/services/authApi';
import { Button } from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import { isValidEmail } from '@/validators';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function submit() {
        setError(null);
        setMessage(null);

        if (!isValidEmail(email)) {
            setError('Email inválido');
            return;
        }

        setLoading(true);
        try {
            const result = await authApi.recoverPassword(email.trim());
            setMessage(result.message);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao pedir recuperação');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-16">
            <div className="text-center">
                <h1 className="title2">Recuperar password</h1>
                <p className="mt-2 text-sm text-muted">
                    Indicamos o teu email e enviamos um link válido durante 2 horas.
                </p>
            </div>

            {message ? (
                <div role="status" className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
                    {message}
                </div>
            ) : (
                <form
                    className="flex flex-col gap-4"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                    }}
                >
                    <TextInput
                        label="Email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        error={error ?? undefined}
                        disabled={loading}
                    />
                    <Button type="submit" isLoading={loading}>Enviar link</Button>
                </form>
            )}

            <Link className="text-center text-sm underline underline-offset-4 hover:text-foreground" href="/login">
                Voltar ao login
            </Link>
        </main>
    );
}
