// Refresh token entregue ao cliente tem o formato `${sessionId}.${secret}`.
// Separa as duas partes; devolve null se o formato for inválido.
export function splitRefreshToken(raw: string): { sessionId: string; secret: string } | null {
    if (typeof raw !== 'string') return null;
    const idx = raw.indexOf('.');
    if (idx <= 0 || idx === raw.length - 1) return null;
    return { sessionId: raw.slice(0, idx), secret: raw.slice(idx + 1) };
}
