// Sanitização de caminhos de uploads partilhada pelos serviços de storage.
// Fonte única de segurança contra path traversal.

/**
 * Sanitiza um subdir relativo: mantém apenas segmentos [A-Za-z0-9._-]
 * (UUIDs, nomes fixos como "profiles") e descarta "." / ".." / vazios.
 */
export function sanitizeSubdir(subdir: string, sep = '/'): string {
    return subdir
        .split('/')
        .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, ''))
        .filter((segment) => segment !== '' && segment !== '.' && segment !== '..')
        .join(sep);
}

/** Sanitiza um segmento único (id de utilizador, pasta, ficheiro). */
export function sanitizeSegment(segment: string): string {
    return segment.replace(/[^a-zA-Z0-9._-]/g, '').replace(/^\.+$/, '');
}

/** Nome seguro para download: remove path e caracteres problemáticos. */
export function sanitizeDownloadName(name: string): string {
    const base = name.split(/[\\/]/).pop() ?? 'download';
    return base.replace(/[\r\n"\\]/g, '_').replace(/[^\w.\- ()]/g, '_').slice(0, 180) || 'download';
}
