export interface JwtPayload {
    userId: string;
    email: string;
}

export interface RealtimeTokenPayload extends JwtPayload {
    scope: 'realtime';
}

export interface IJwtService {
    /** Access token de curta duração. */
    generateToken(payload: JwtPayload): string;
    /** Token opaco para o refresh token (não é JWT). */
    generateRefreshToken(): string;
    /** Data de expiração do refresh token. */
    getRefreshTokenExpiry(): Date;
    /** Token dedicado ao EventSource (scope `realtime`). */
    generateRealtimeToken(payload: JwtPayload): string;
    /** Verifica um access token. Lança se inválido/expirado. */
    verifyToken(token: string): JwtPayload;
    /** Verifica um token de realtime e rejeita access tokens. */
    verifyRealtimeToken(token: string): JwtPayload;
}
