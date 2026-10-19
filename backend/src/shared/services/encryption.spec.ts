import { describe, it, expect, beforeAll } from 'vitest';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
    const service = new EncryptionService();

    beforeAll(() => {
        process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    });

    it('faz round-trip de texto', () => {
        const encrypted = service.encrypt('segredo');
        expect(encrypted).not.toContain('segredo');
        expect(service.decrypt(encrypted)).toBe('segredo');
        expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('deteta ciphertext alterado (auth tag)', () => {
        const encrypted = service.encrypt('segredo');
        const parts = encrypted.split(':');
        const last = parts[2].endsWith('0') ? '1' : '0';
        const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -1)}${last}`;
        expect(() => service.decrypt(tampered)).toThrow();
    });

    it('trata valores opcionais', () => {
        expect(service.encryptOptional(null)).toBeNull();
        expect(service.decryptOptional('')).toBeNull();
    });
});
