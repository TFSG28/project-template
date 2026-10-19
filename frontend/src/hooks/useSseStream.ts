'use client';

import { useEffect, useRef, useState } from 'react';
import { authApi } from '@/services/authApi';

export interface RealtimeEvent {
    type: string;
    [key: string]: unknown;
}

export type SseStatus = 'connecting' | 'open' | 'closed';

interface UseSseStreamOptions {
    onEvent?: (event: RealtimeEvent) => void;
    enabled?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const RETRY_MS = 5_000;

/**
 * Liga ao hub SSE do backend.
 *
 * O EventSource não envia cookies/headers de forma fiável, por isso o hook
 * pede um token curto (`/auth/stream-token`) a cada (re)conexão. O access
 * token httpOnly nunca vai para a query.
 */
export function useSseStream({ onEvent, enabled = true }: UseSseStreamOptions = {}) {
    const [status, setStatus] = useState<SseStatus>('closed');
    const onEventRef = useRef(onEvent);

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    const connectRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') {
            // Reset when the stream is disabled/unavailable. This is an
            // external-system sync (EventSource lifecycle), not derived state.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStatus('closed');
            return;
        }

        let source: EventSource | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;

        const scheduleRetry = () => {
            if (cancelled || retryTimer) return;
            retryTimer = setTimeout(() => {
                retryTimer = null;
                void connect();
            }, RETRY_MS);
        };

        const connect = async () => {
            if (cancelled) return;
            setStatus('connecting');

            try {
                const token = await authApi.streamToken();
                if (cancelled) return;

                source = new EventSource(
                    `${API_URL}/api/v1/realtime/stream?token=${encodeURIComponent(token)}`
                );

                source.onopen = () => setStatus('open');

                source.onmessage = (event: MessageEvent<string>) => {
                    try {
                        const data = JSON.parse(event.data) as RealtimeEvent;
                        if (data?.type) onEventRef.current?.(data);
                    } catch {
                        // Evento malformado: ignora em vez de matar a ligação.
                    }
                };

                source.onerror = () => {
                    setStatus('closed');
                    source?.close();
                    source = null;
                    scheduleRetry();
                };
            } catch {
                setStatus('closed');
                scheduleRetry();
            }
        };

        connectRef.current = () => {
            source?.close();
            source = null;
            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }
            void connect();
        };

        void connect();

        return () => {
            cancelled = true;
            connectRef.current = () => undefined;
            if (retryTimer) clearTimeout(retryTimer);
            source?.close();
        };
    }, [enabled]);

    return { status, reconnect: () => connectRef.current() };
}
