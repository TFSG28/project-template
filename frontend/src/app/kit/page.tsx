'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import TextInput from '@/components/ui/TextInput';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';

const swatches = [
    { name: 'background', value: 'var(--background)' },
    { name: 'surface', value: 'var(--surface)' },
    { name: 'surface-2', value: 'var(--surface-2)' },
    { name: 'border', value: 'var(--border)' },
    { name: 'accent', value: 'var(--accent)' },
    { name: 'success', value: 'var(--success)' },
    { name: 'warning', value: 'var(--warning)' },
    { name: 'danger', value: 'var(--danger)' },
];

export default function KitPage() {
    const { user, logout } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 py-16">
            <header className="flex flex-col gap-4 border-b border-border pb-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted">Design system</p>
                        <h1 className="title2 mt-1">UI Kit</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" href="/">Início</Button>
                        {user ? (
                            <Button onClick={() => void logout()}>Sair</Button>
                        ) : (
                            <Button href="/login">Entrar</Button>
                        )}
                    </div>
                </div>
                <p className="max-w-2xl text-sm text-muted">
                    Componentes e tokens do template. Os valores vivem em
                    <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs">globals.css</code>
                    e mudam com o tema claro/escuro.
                </p>
            </header>

            <section className="flex flex-col gap-4">
                <h2 className="title3">Cores</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {swatches.map((swatch) => (
                        <div key={swatch.name} className="overflow-hidden rounded-xl border border-border">
                            <div className="h-16 border-b border-border" style={{ background: swatch.value }} />
                            <p className="bg-surface px-3 py-2 text-xs text-muted">{swatch.name}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="title3">Botões</h2>
                <div className="flex flex-wrap items-center gap-3">
                    <Button>Primário</Button>
                    <Button variant="secondary">Secundário</Button>
                    <Button size="small">Pequeno</Button>
                    <Button isLoading>A processar</Button>
                    <Button disabled>Desativado</Button>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted">
                    <Spinner size={16} />
                    Spinner inline
                </div>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="title3">Badges</h2>
                <div className="flex flex-wrap gap-2">
                    <Badge>Neutro</Badge>
                    <Badge tone="accent">Destaque</Badge>
                    <Badge tone="success">Concluído</Badge>
                    <Badge tone="warning">Pendente</Badge>
                    <Badge tone="danger">Erro</Badge>
                </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
                    <h2 className="title3">Formulário</h2>
                    <TextInput label="Nome" placeholder="O teu nome" helperText="Texto de apoio." />
                    <TextInput label="Email" type="email" placeholder="nome@exemplo.com" />
                    <TextInput label="Password" type="password" defaultValue="segredo" />
                    <Select
                        label="Ambiente"
                        placeholder="Escolhe"
                        defaultValue="dev"
                        options={[
                            { value: 'dev', text: 'Desenvolvimento' },
                            { value: 'prod', text: 'Produção' },
                        ]}
                    />
                </div>

                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
                    <h2 className="title3">Estados</h2>
                    <div className="flex flex-col gap-3">
                        <Skeleton width="60%" />
                        <Skeleton width="100%" />
                        <Skeleton width="80%" />
                        <div className="flex items-center gap-3">
                            <Skeleton variant="circular" width={40} height={40} />
                            <div className="flex w-full flex-col gap-2">
                                <Skeleton width="40%" />
                                <Skeleton width="70%" />
                            </div>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={() => setModalOpen(true)}>
                        Abrir modal
                    </Button>
                </div>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="title3">Tipografia</h2>
                <div className="rounded-2xl border border-border bg-surface p-6">
                    <p className="title">Título grande</p>
                    <p className="title2 mt-4">Título de secção</p>
                    <p className="title3 mt-4">Subtítulo</p>
                    <p className="mt-4 text-sm text-muted">
                        Corpo de texto em <strong>tom muted</strong> para informação secundária.
                    </p>
                </div>
            </section>

            <footer className="border-t border-border pt-6 text-sm text-muted">
                <Link className="underline underline-offset-4 hover:text-foreground" href="/">
                    Voltar ao início
                </Link>
            </footer>

            {modalOpen && (
                <Modal onClose={() => setModalOpen(false)}>
                    <div className="flex max-w-sm flex-col gap-3">
                        <h2 className="title3">Modal</h2>
                        <p className="text-sm text-muted">
                            Overlay com backdrop, fecho pelo botão. Para ecrãs pequenos,
                            o conteúdo faz scroll dentro do painel.
                        </p>
                        <Button onClick={() => setModalOpen(false)}>Fechar</Button>
                    </div>
                </Modal>
            )}
        </main>
    );
}
