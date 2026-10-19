interface SpinnerProps {
    size?: number;
    label?: string;
    className?: string;
}

export function Spinner({ size = 20, label = 'A carregar', className = '' }: Readonly<SpinnerProps>) {
    return (
        <span role="status" aria-label={label} className={`inline-flex ${className}`.trim()}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                className="animate-spin"
                aria-hidden
            >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
        </span>
    );
}
