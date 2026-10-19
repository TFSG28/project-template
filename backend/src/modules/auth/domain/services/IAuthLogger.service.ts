export type AuthAction =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGIN_BLOCKED'
    | 'LOGOUT'
    | 'TOKEN_REFRESH'
    | 'TOKEN_REFRESH_FAILED'
    | 'PASSWORD_RESET'
    | 'RECOVERY_EMAIL_FAILED';

export interface AuthLogMeta {
    email?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
}

export interface IAuthLoggerService {
    logAuthAction(action: AuthAction, meta?: AuthLogMeta): Promise<void>;
}
