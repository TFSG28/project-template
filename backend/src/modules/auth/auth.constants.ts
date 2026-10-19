// Tempos de vida da autenticação. Fonte única partilhada pelo JwtService
// (expiração do JWT/sessão) e pelo controller (maxAge dos cookies).
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutos
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
export const PASSWORD_RESET_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

// Token usado apenas pelo EventSource. Curto porque o cliente pede um novo a
// cada reconexão; nunca é o access token nem participa na rotação do refresh.
export const REALTIME_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutos

// Custo do bcrypt. Lido do env com fallback seguro.
export const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS) || 12;
