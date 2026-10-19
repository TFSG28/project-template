import path from 'node:path';

/** Extensões que nunca devem ser servidas inline (XSS / execução). */
const FORCE_DOWNLOAD_EXTENSIONS = new Set([
    '.html', '.htm', '.xhtml', '.svg', '.xml',
    '.js', '.mjs', '.cjs', '.json',
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.com', '.scr',
    '.php', '.phtml', '.jsp', '.asp', '.aspx', '.cgi', '.pl',
    '.jar', '.war', '.class',
]);

/** Tipos que podem ser mostrados inline com segurança num browser. */
const INLINE_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico',
    '.pdf', '.txt', '.csv', '.mp3', '.mp4', '.webm', '.wav', '.ogg',
]);

export function isInlineSafe(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (FORCE_DOWNLOAD_EXTENSIONS.has(ext)) return false;
    return INLINE_EXTENSIONS.has(ext);
}

/** Rejeita no upload executáveis/HTML/SVG em vez de os guardar. */
export function isDangerousUpload(name: string): boolean {
    return FORCE_DOWNLOAD_EXTENSIONS.has(path.extname(name).toLowerCase());
}

/**
 * Headers aplicados a ficheiros servidos de /uploads. O `nosniff` impede que
 * o browser adivinhe um tipo executável a partir do conteúdo; o
 * Content-Disposition força download para tipos perigosos.
 */
export function uploadResponseHeaders(res: {
    setHeader: (name: string, value: string) => unknown;
}, filePath: string, downloadName: string): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (!isInlineSafe(filePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    }
}
