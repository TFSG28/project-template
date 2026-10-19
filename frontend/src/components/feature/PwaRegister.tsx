'use client';

import { useEffect } from 'react';

/**
 * Regista o service worker baseline em produção. Em desenvolvimento fica
 * desligado para o cache não servir código antigo do Next.
 */
export function PwaRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

        const register = () => {
            navigator.serviceWorker.register('/sw.js').catch(() => undefined);
        };

        if (document.readyState === 'complete') register();
        else window.addEventListener('load', register, { once: true });

        return () => window.removeEventListener('load', register);
    }, []);

    return null;
}
