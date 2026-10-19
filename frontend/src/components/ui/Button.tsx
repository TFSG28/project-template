'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'small' | 'medium';

interface ButtonProps {
    children: ReactNode;
    onClick?: () => void;
    type?: 'submit' | 'reset' | 'button';
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    isLoading?: boolean;
    href?: string;
    className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-bgBtn text-background hover:opacity-90',
    secondary: 'border border-border bg-surface-2 text-foreground hover:bg-surface',
};

const sizeClasses: Record<ButtonSize, string> = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
};

export function Button({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    size = 'medium',
    disabled = false,
    isLoading = false,
    href,
    className = '',
}: Readonly<ButtonProps>) {
    const classes = [
        variantClasses[variant],
        sizeClasses[size],
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    // Rendered as a link when `href` is set (navigation), otherwise a button.
    if (href) {
        return (
            <Link href={href} className={classes} onClick={onClick}>
                {children}
            </Link>
        );
    }

    return (
        <button
            type={type}
            className={classes}
            onClick={onClick}
            disabled={disabled || isLoading}
            aria-busy={isLoading || undefined}
        >
            {isLoading ? 'Carregando...' : children}
        </button>
    );
}
