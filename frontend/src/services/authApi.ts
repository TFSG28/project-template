/**
 * Auth API layer.
 *
 * Centralizes every /auth endpoint call and returns typed, already-unwrapped
 * data (no `{ status, data }` envelope leaking into components/contexts).
 * Endpoint URLs and response shapes live here and nowhere else.
 */
import { fetchClient, ApiError } from '@/libs/fetchClient';
import type { User, ApiEnvelope } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE = `${API_URL}/api/v1`;

export interface LoginResult {
    user: User;
    csrfToken: string;
}

/**
 * Reads the backend envelope and returns `data`, throwing a typed error with
 * the stable backend `code` on a non-2xx response.
 */
async function unwrap<T>(response: Response): Promise<T> {
    const body = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok) {
        throw new ApiError(
            body.message || 'Erro na requisição',
            response.status,
            body.code ?? null
        );
    }
    return body.data as T;
}

async function refreshSession(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!response.ok) return false;

        const body = (await response.json()) as ApiEnvelope<{ csrfToken: string }>;
        if (body.data?.csrfToken) fetchClient.setCsrfToken(body.data.csrfToken);
        return true;
    } catch {
        return false;
    }
}

export const authApi = {
    login(email: string, password: string): Promise<LoginResult> {
        return fetchClient.post('/auth/login', { email, password }).then(unwrap<LoginResult>);
    },

    async logout(): Promise<void> {
        // Ignore network errors on logout; local state is cleared regardless.
        try {
            await fetchClient.post('/auth/logout');
        } catch {
            /* noop */
        }
    },

    /**
     * Restores the session from the httpOnly cookie on app start.
     * Uses raw fetch (not fetchClient) so a 401 "not logged in" does NOT trip
     * the client's redirect interceptor. If the short-lived access token has
     * expired but the refresh cookie is still valid, refresh once and retry.
     */
    async restoreSession(): Promise<User | null> {
        try {
            let response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });

            if (response.status === 401 && await refreshSession()) {
                response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
            }

            if (!response.ok) return null;
            const { data } = (await response.json()) as ApiEnvelope<User>;
            return data ?? null;
        } catch {
            return null;
        }
    },

    recoverPassword(email: string): Promise<{ message: string }> {
        return fetchClient
            .post('/auth/recover-password', { email })
            .then(unwrap<{ message: string }>);
    },

    resetPassword(token: string, password: string): Promise<{ message: string }> {
        return fetchClient
            .post('/auth/reset-password', { token, password })
            .then(unwrap<{ message: string }>);
    },

    async streamToken(): Promise<string> {
        const result = await fetchClient
            .get('/auth/stream-token')
            .then(unwrap<{ token: string }>);
        return result.token;
    },
};
