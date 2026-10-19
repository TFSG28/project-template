/**
 * HTTP client with cookie-based auth support:
 * - credentials: 'include' on every request (httpOnly cookies)
 * - CSRF token handling for unsafe methods (stored in sessionStorage)
 * - single-flight access-token refresh on 401 (avoids refresh stampede)
 * - CSRF retry on 403
 * - uploadWithProgress for file uploads
 * - stable backend `code` exposed as ApiError.code
 *
 * Degrades gracefully: if the backend exposes no /auth/refresh or CSRF, the
 * refresh/CSRF paths simply fail and fall back to redirecting to /login.
 */

const API_PREFIX = '/api/v1';

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly code: string | null = null
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

class FetchClient {
    private readonly baseURL: string = process.env.NEXT_PUBLIC_API_URL || '';
    private readonly CSRF_TOKEN_KEY = 'csrf_token';
    private isRefreshing = false;
    private refreshPromise: Promise<boolean> | null = null;

    setCsrfToken(token: string) {
        if (globalThis.window !== undefined) {
            sessionStorage.setItem(this.CSRF_TOKEN_KEY, token);
        }
    }

    clearCsrfToken() {
        if (globalThis.window !== undefined) {
            sessionStorage.removeItem(this.CSRF_TOKEN_KEY);
        }
    }

    getCsrfToken(): string | null {
        if (globalThis.window !== undefined) {
            return sessionStorage.getItem(this.CSRF_TOKEN_KEY);
        }
        return null;
    }

    /** Prefixos relativos com /api/v1, mantendo paths já prefixados. */
    private apiPath(url: string): string {
        if (url.startsWith('/api/')) return url;
        return `${API_PREFIX}${url.startsWith('/') ? url : `/${url}`}`;
    }

    private async refreshAccessToken(): Promise<boolean> {
        // If a refresh is already in progress, await it instead of firing another.
        if (this.isRefreshing && this.refreshPromise) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = (async () => {
            try {
                const response = await fetch(`${this.baseURL}${API_PREFIX}/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                });

                if (!response.ok) return false;

                const body = (await response.json()) as {
                    data?: { csrfToken?: string };
                    csrfToken?: string;
                };
                const csrfToken = body.data?.csrfToken ?? body.csrfToken;
                if (csrfToken) this.setCsrfToken(csrfToken);
                return true;
            } catch (error) {
                console.error('Error refreshing token:', error);
                return false;
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    private isUnsafeMethod(method?: string): boolean {
        return !['GET', 'HEAD', 'OPTIONS'].includes(method || 'GET');
    }

    // Auth endpoints must not trigger the refresh/redirect interceptor:
    // a 401 from /login means "bad credentials", not "session expired".
    private isAuthExempt(url: string): boolean {
        const path = this.apiPath(url);
        return path === `${API_PREFIX}/auth/refresh`
            || path === `${API_PREFIX}/auth/login`
            || path === `${API_PREFIX}/auth/logout`
            || path === `${API_PREFIX}/auth/recover-password`
            || path === `${API_PREFIX}/auth/reset-password`;
    }

    private buildConfig(options: RequestInit): RequestInit {
        const config: RequestInit = {
            ...options,
            credentials: 'include',
            headers: { ...options.headers },
        };

        if (!(options.body instanceof FormData)) {
            config.headers = { 'Content-Type': 'application/json', ...config.headers };
        }

        const csrfToken = this.getCsrfToken();
        if (csrfToken && this.isUnsafeMethod(options.method)) {
            config.headers = { ...config.headers, 'X-CSRF-Token': csrfToken };
        }

        return config;
    }

    private failAuth(message: string): never {
        this.clearCsrfToken();
        if (globalThis.window !== undefined) {
            globalThis.location.href = '/login';
        }
        throw new ApiError(message, 401, 'UNAUTHORIZED');
    }

    private async refreshAndRetry(url: string, config: RequestInit, refreshCsrf = false): Promise<Response | null> {
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) return null;

        if (refreshCsrf) {
            const newCsrfToken = this.getCsrfToken();
            if (newCsrfToken && this.isUnsafeMethod(config.method)) {
                config.headers = { ...config.headers, 'X-CSRF-Token': newCsrfToken };
            }
        }

        const retryResponse = await fetch(`${this.baseURL}${this.apiPath(url)}`, config);
        return retryResponse.ok ? retryResponse : null;
    }

    /** Lê o `code` estável do envelope de erro sem consumir o body original. */
    async readErrorCode(response: Response): Promise<string | null> {
        try {
            const data = (await response.clone().json()) as { code?: string | null };
            return data?.code ?? null;
        } catch {
            return null;
        }
    }

    private async handleCsrfFailure(url: string, response: Response, config: RequestInit): Promise<Response> {
        const data = await response.clone().json().catch(() => ({})) as {
            code?: string;
            message?: string;
        };
        const isCsrfError = (data.code === 'FORBIDDEN' || data.message?.includes('CSRF'))
            && !this.isAuthExempt(url);
        if (!isCsrfError) return response;

        const retry = await this.refreshAndRetry(url, config, true);
        if (retry) return retry;
        this.failAuth('Sessão expirada');
    }

    async fetch(url: string, options: RequestInit = {}) {
        const config = this.buildConfig(options);

        try {
            const response = await fetch(`${this.baseURL}${this.apiPath(url)}`, config);

            if (response.status === 401 && !this.isAuthExempt(url)) {
                const retry = await this.refreshAndRetry(url, config);
                if (retry) return retry;
                this.failAuth('Não autenticado');
            }

            if (response.status === 403) {
                return await this.handleCsrfFailure(url, response, config);
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    get(url: string) {
        return this.fetch(url);
    }

    post(url: string, data?: unknown) {
        return this.fetch(url, {
            method: 'POST',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    put(url: string, data?: unknown) {
        return this.fetch(url, {
            method: 'PUT',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    patch(url: string, data?: unknown) {
        return this.fetch(url, {
            method: 'PATCH',
            body: data instanceof FormData ? data : JSON.stringify(data),
        });
    }

    delete(url: string) {
        return this.fetch(url, {
            method: 'DELETE',
        });
    }

    /**
     * Uploads FormData via XHR to report upload progress (fetch can't do this).
     */
    async uploadWithProgress(
        url: string,
        formData: FormData,
        onProgress?: (progress: number) => void
    ): Promise<Response> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        onProgress((e.loaded / e.total) * 100);
                    }
                });
            }

            xhr.onload = () => {
                const response = new Response(xhr.responseText, {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    headers: new Headers(
                        xhr.getAllResponseHeaders()
                            .split('\r\n')
                            .reduce((headers, line) => {
                                const [key, value] = line.split(': ');
                                if (key && value) {
                                    headers[key] = value;
                                }
                                return headers;
                            }, {} as Record<string, string>)
                    ),
                });

                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(response);
                } else {
                    reject(new ApiError(`HTTP Error: ${xhr.status}`, xhr.status));
                }
            };

            xhr.onerror = () => reject(new ApiError('Network error', 0));
            xhr.ontimeout = () => reject(new ApiError('Request timeout', 0));

            xhr.open('POST', `${this.baseURL}${this.apiPath(url)}`);
            xhr.withCredentials = true;

            const csrfToken = this.getCsrfToken();
            if (csrfToken) {
                xhr.setRequestHeader('X-CSRF-Token', csrfToken);
            }
            xhr.send(formData);
        });
    }
}

export const fetchClient = new FetchClient();
