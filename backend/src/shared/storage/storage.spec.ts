import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LocalAttachmentStorageService } from './LocalAttachmentStorage.service';
import { sanitizeSubdir } from './path.util';
import { isDangerousUpload, isInlineSafe } from './upload.security';

describe('LocalAttachmentStorageService', () => {
    let tmpDir: string | undefined;

    afterEach(async () => {
        if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
        tmpDir = undefined;
    });

    it('grava e remove um ficheiro dentro da raiz', async () => {
        tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pt-storage-'));
        const storage = new LocalAttachmentStorageService(tmpDir);

        const stored = await storage.save(
            { data: Buffer.from('conteúdo'), originalName: 'foto.PNG' },
            'users/abc'
        );

        expect(stored.url).toMatch(/^\/uploads\/users\/abc\/.+\.png$/);
        const filePath = storage.resolveSafePath(stored.url);
        expect(filePath).toBeTruthy();
        expect(await readFile(filePath!, 'utf8')).toBe('conteúdo');

        await storage.remove(stored.url);
        expect(storage.resolveSafePath(stored.url)).toBeTruthy();
    });

    it('rejeita path traversal', () => {
        const storage = new LocalAttachmentStorageService('/tmp/uploads-test');
        expect(storage.resolveSafePath('/uploads/../etc/passwd')).toBeNull();
        expect(storage.resolveSafePath('/uploads/%2e%2e/etc/passwd')).toBeNull();
        expect(storage.resolveSafePath('/uploads/./x')).toBeTruthy();
        expect(storage.resolveSafePath('/other/x')).toBeNull();
    });
});

describe('upload security helpers', () => {
    it('sanitiza subdirs', () => {
        expect(sanitizeSubdir('users/../abc')).toBe('users/abc');
        expect(sanitizeSubdir('../../etc')).toBe('etc');
    });

    it('marca tipos perigosos para download', () => {
        expect(isInlineSafe('foto.png')).toBe(true);
        expect(isInlineSafe('doc.pdf')).toBe(true);
        expect(isInlineSafe('page.html')).toBe(false);
        expect(isDangerousUpload('script.js')).toBe(true);
    });
});
