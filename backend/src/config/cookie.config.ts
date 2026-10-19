import {
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS,
} from '../modules/auth/auth.constants';

/**
 * Cookie configuration for cookie-based auth.
 *
 * - access_token: short-lived httpOnly JWT cookie (15 min).
 * - refresh_token: long-lived httpOnly opaque token (7 days), restricted to
 *   the auth endpoints. It never reaches application routes.
 * - csrf_token: readable cookie for the stateless double-submit CSRF check
 *   (the client echoes it back in the X-CSRF-Token header).
 *
 * ponytail: sameSite 'lax' assumes frontend and backend share a site.
 * If they live on different domains (e.g. app.example.com + api.example.com),
 * switch to sameSite 'none' with secure: true.
 */
const isProd = process.env.NODE_ENV === 'production';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const CSRF_COOKIE = 'csrf_token';

export const REFRESH_TOKEN_PATH = '/api/v1/auth';

export const accessCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: ACCESS_TOKEN_TTL_MS,
    path: '/',
};

export const refreshCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: REFRESH_TOKEN_PATH,
};

export const csrfCookieOptions = {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: '/',
};

// Options used when clearing cookies (must match path/sameSite/secure).
export const clearAccessCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
};

export const clearRefreshCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: REFRESH_TOKEN_PATH,
};

export const clearCsrfCookieOptions = {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
};
