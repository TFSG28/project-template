'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/feature/LoginForm';

export default function LoginPage() {
    const router = useRouter();

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
            <div className="text-center">
                <h1 className="title2">Entrar</h1>
                <p className="mt-2 text-sm text-muted">Acede à tua conta</p>
            </div>

            <LoginForm onSuccess={() => router.push('/')} />

            <div className="flex flex-col gap-2 text-center text-sm">
                <Link className="underline underline-offset-4 hover:text-foreground" href="/forgot-password">
                    Esqueci-me da password
                </Link>
                <Link className="text-muted underline underline-offset-4 hover:text-foreground" href="/">
                    Voltar ao início
                </Link>
            </div>
        </main>
    );
}
