'use client';

import { useEffect } from 'react';
import { logClientError } from '@/libs/clientLogger';

/**
 * Captura erros não tratados do browser e envia-os para o backend.
 * Montado uma vez no root layout; não renderiza nada.
 */
export function DiagnosticsBridge() {
    useEffect(() => {
        const onError = (event: ErrorEvent) => {
            logClientError(event.message || 'Erro global não tratado', {
                source: event.filename,
                line: event.lineno,
                column: event.colno,
            });
        };

        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message = reason instanceof Error ? reason.message : String(reason);
            logClientError(`Promise rejeitada: ${message}`, {
                stack: reason instanceof Error ? reason.stack : undefined,
            });
        };

        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onUnhandledRejection);

        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
        };
    }, []);

    return null;
}
