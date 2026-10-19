'use client';

import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { useSseStream, type RealtimeEvent } from '@/hooks/useSseStream';

/**
 * Liga o SSE enquanto há sessão e mostra notificações de servidor.
 * Outros módulos podem publicar eventos com `publishToUser`.
 */
export function RealtimeBridge() {
    const { user } = useAuth();

    const onEvent = useCallback((event: RealtimeEvent) => {
        if (event.type === 'notification' && typeof event.message === 'string') {
            toast.info(event.message);
        }
    }, []);

    useSseStream({ enabled: Boolean(user), onEvent });

    return null;
}
