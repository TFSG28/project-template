/**
 * Frontend diagnostics: only errors and warnings.
 *
 * Fire-and-forget to POST /api/v1/diagnostics/client-log. Uses raw fetch (not
 * fetchClient) so an anonymous 401 never triggers a refresh/redirect loop.
 * The backend appends to logs/front/<userId>.log.
 */

type ClientLogLevel = 'error' | 'warn';

interface ClientLogPayload {
    level: ClientLogLevel;
    message: string;
    context?: Record<string, unknown> | null;
    userAgent?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const ENDPOINT = `${API_URL}/api/v1/diagnostics/client-log`;

// A mesma mensagem em rajada (ex.: SSE a reconectar) não gera N logs.
const DEDUPE_WINDOW_MS = 30_000;
const lastSent = new Map<string, number>();

function shouldSend(key: string): boolean {
    const now = Date.now();
    const previous = lastSent.get(key);
    if (previous && now - previous < DEDUPE_WINDOW_MS) return false;
    lastSent.set(key, now);

    if (lastSent.size > 200) {
        for (const [entry, timestamp] of lastSent) {
            if (now - timestamp > DEDUPE_WINDOW_MS) lastSent.delete(entry);
        }
    }
    return true;
}

function normalizeContext(context?: unknown): Record<string, unknown> | null {
    if (!context || typeof context !== 'object') return null;
    try {
        return JSON.parse(JSON.stringify(context)) as Record<string, unknown>;
    } catch {
        return null;
    }
}

export function logClient(level: ClientLogLevel, message: string, context?: unknown): void {
    if (typeof window === 'undefined') return;
    if (!shouldSend(`${level}:${message}`)) return;

    const payload: ClientLogPayload = {
        level,
        message: message.slice(0, 2_000),
        context: normalizeContext(context),
        userAgent: navigator.userAgent,
    };

    void fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
    }).catch(() => undefined);
}

export const logClientError = (message: string, context?: unknown) => logClient('error', message, context);
export const logClientWarn = (message: string, context?: unknown) => logClient('warn', message, context);
