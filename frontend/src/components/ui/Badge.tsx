import type { ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const toneClasses: Record<Tone, string> = {
    neutral: 'border-border bg-surface-2 text-foreground',
    accent: 'border-accent bg-accent text-accent-foreground',
    success: 'border-success bg-success text-success-foreground',
    warning: 'border-warning bg-warning text-warning-foreground',
    danger: 'border-danger bg-danger text-danger-foreground',
};

interface BadgeProps {
    tone?: Tone;
    children: ReactNode;
    className?: string;
}

export function Badge({ tone = 'neutral', children, className = '' }: Readonly<BadgeProps>) {
    return (
        <span
            className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`.trim()}
        >
            {children}
        </span>
    );
}
