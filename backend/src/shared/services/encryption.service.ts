import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // recomendado para GCM
const AUTH_TAG_BYTES = 16;

/**
 * Encriptação simétrica de campos sensíveis em repouso.
 *
 * Formato: `<iv-hex>:<auth-tag-hex>:<ciphertext-hex>`.
 * O auth tag garante integridade: um valor alterado na BD falha ao decifrar
 * em vez de devolver lixo silenciosamente.
 */
export class EncryptionService {
    private getKey(): Buffer {
        const hex = process.env.ENCRYPTION_KEY ?? '';
        if (!/^[0-9a-f]{64}$/i.test(hex)) {
            throw new Error('ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)');
        }
        return Buffer.from(hex, 'hex');
    }

    encrypt(text: string): string {
        const iv = crypto.randomBytes(IV_BYTES);
        const cipher = crypto.createCipheriv(ALGORITHM, this.getKey(), iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    decrypt(encryptedData: string): string {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const [ivHex, tagHex, cipherHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(tagHex, 'hex');
        if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
            throw new Error('Invalid encrypted data format');
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, this.getKey(), iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([
            decipher.update(Buffer.from(cipherHex, 'hex')),
            decipher.final(),
        ]).toString('utf8');
    }

    encryptOptional(text?: string | null): string | null {
        return text ? this.encrypt(text) : null;
    }

    decryptOptional(encryptedData?: string | null): string | null {
        return encryptedData ? this.decrypt(encryptedData) : null;
    }

    isEncrypted(text: string): boolean {
        return /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i.test(text);
    }
}

export const encryptionService = new EncryptionService();
