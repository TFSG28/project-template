import { createReadStream, type ReadStream } from 'node:fs';
import { copyFile, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/AppError';
import { sanitizeSegment, sanitizeSubdir } from './path.util';

export interface UploadableFile {
    tempFilePath?: string;
    data?: Buffer;
    originalName: string;
}

export interface StoredAttachment {
    storedName: string;
    /** Caminho relativo servido por express.static (ex.: /uploads/<uuid>.png). */
    url: string;
}

/** Raiz dos ficheiros públicos. Configurável para testes/volumes Docker. */
export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

const UPLOAD_URL_PREFIX = '/uploads/';

export class InvalidUploadError extends AppError {
    constructor(message = 'Ficheiro inválido') {
        super(message, 400, true, 'INVALID_UPLOAD');
    }
}

/**
 * Armazenamento local de anexos: grava em <UPLOAD_ROOT>/<subdir> e devolve a
 * URL pública. A interface é pequena o suficiente para trocar por R2/S3 sem
 * tocar nos casos de uso.
 */
export class LocalAttachmentStorageService {
    constructor(private readonly root: string = UPLOAD_ROOT) {}

    async save(file: UploadableFile, subdir = ''): Promise<StoredAttachment> {
        const safeSubdir = sanitizeSubdir(subdir);
        const extension = path.extname(file.originalName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
        const storedName = `${randomUUID()}${extension}`;
        const directory = path.join(this.root, safeSubdir);

        await mkdir(directory, { recursive: true });
        const destination = path.join(directory, storedName);

        if (file.tempFilePath) {
            try {
                await rename(file.tempFilePath, destination);
            } catch {
                // Temp dir noutro filesystem (Docker): copia + remove.
                await copyFile(file.tempFilePath, destination);
                await unlink(file.tempFilePath).catch(() => undefined);
            }
        } else if (file.data) {
            await writeFile(destination, file.data);
        } else {
            throw new InvalidUploadError('Ficheiro sem conteúdo');
        }

        return {
            storedName,
            url: `${UPLOAD_URL_PREFIX}${[safeSubdir, storedName].filter(Boolean).join('/')}`,
        };
    }

    async remove(url: string): Promise<void> {
        const filePath = this.resolveSafePath(url);
        if (!filePath) return;
        await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== 'ENOENT') throw error;
        });
    }

    createReadStream(url: string): ReadStream {
        const filePath = this.resolveSafePath(url);
        if (!filePath) throw new AppError('Ficheiro não encontrado', 404, true, 'FILE_NOT_FOUND');
        return createReadStream(filePath);
    }

    /**
     * Resolve uma URL /uploads/... para um caminho dentro da raiz. Devolve null
     * se a URL tentar sair da raiz (path traversal) ou for inválida.
     */
    resolveSafePath(url: string): string | null {
        if (typeof url !== 'string' || !url.startsWith(UPLOAD_URL_PREFIX)) return null;

        let relative: string;
        try {
            relative = decodeURIComponent(url.slice(UPLOAD_URL_PREFIX.length).split('?')[0]);
        } catch {
            return null;
        }

        const normalized = path.posix.normalize(relative);
        if (normalized === '.' || normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
            return null;
        }

        const segments = normalized.split('/').filter(Boolean);
        if (segments.some((segment) => !sanitizeSegment(segment))) return null;

        const absolute = path.resolve(this.root, ...segments);
        const rootWithSep = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`;
        return absolute === this.root || absolute.startsWith(rootWithSep) ? absolute : null;
    }
}

export const localAttachmentStorage = new LocalAttachmentStorageService();
