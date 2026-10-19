import { Prisma } from '../../generated/prisma/client';
import { encryptionService } from '../services/encryption.service';

/**
 * Campos encriptados por modelo. Vazio por omissão: nenhum campo é cifrado
 * sem uma decisão explícita (cifrar `email` quebraria lookups únicos).
 *
 * Exemplo:
 *   User: ['phone', 'address'],
 *   Message: ['content'],
 */
const ENCRYPTED_FIELDS: Readonly<Record<string, readonly string[]>> = {};

/** Campos cujo valor decifrado é JSON serializado (arrays/objetos). */
const JSON_PARSE_FIELDS: Readonly<Record<string, readonly string[]>> = {};

type Data = Record<string, unknown>;

const WRITE_OPERATIONS = new Set([
    'create',
    'createMany',
    'update',
    'updateMany',
    'upsert',
]);

function isPlainObject(value: unknown): value is Data {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function encryptFields(model: string, data: Data): Data {
    const fields = ENCRYPTED_FIELDS[model];
    if (!fields?.length) return data;

    const result: Data = { ...data };
    for (const field of fields) {
        const value = result[field];
        if (value == null) continue;
        if (typeof value === 'string') {
            if (!encryptionService.isEncrypted(value)) {
                result[field] = encryptionService.encrypt(value);
            }
        } else if (typeof value === 'object') {
            result[field] = encryptionService.encrypt(JSON.stringify(value));
        }
    }
    return result;
}

function decryptFields(model: string, data: Data): Data {
    const fields = ENCRYPTED_FIELDS[model];
    if (!fields?.length) return data;

    const result: Data = { ...data };
    for (const field of fields) {
        const value = result[field];
        if (typeof value !== 'string' || !encryptionService.isEncrypted(value)) continue;

        const decrypted = encryptionService.decrypt(value);
        const shouldParseJson = JSON_PARSE_FIELDS[model]?.includes(field) ?? false;
        if (shouldParseJson) {
            try {
                result[field] = JSON.parse(decrypted);
            } catch {
                result[field] = decrypted;
            }
        } else {
            result[field] = decrypted;
        }
    }
    return result;
}

function transformData(model: string, data: unknown, mode: 'encrypt' | 'decrypt'): unknown {
    if (Array.isArray(data)) {
        return data.map((item) => (isPlainObject(item) ? transformData(model, item, mode) : item));
    }
    if (!isPlainObject(data)) return data;
    return mode === 'encrypt' ? encryptFields(model, data) : decryptFields(model, data);
}

/**
 * Prisma client extension for field-level encryption at rest.
 *
 * Encrypts on write (`create`/`update`/`upsert`/…) and decrypts on read for
 * the models listed in ENCRYPTED_FIELDS. With the default empty map it is a
 * pass-through, so enabling a field is a one-line change.
 */
export const encryptionExtension = Prisma.defineExtension({
    name: 'encryption',
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }: {
                model: string;
                operation: string;
                args: Data;
                query: (args: Data) => Promise<unknown>;
            }) {
                if (!ENCRYPTED_FIELDS[model]?.length) {
                    return query(args);
                }

                const nextArgs = { ...args };
                if (WRITE_OPERATIONS.has(operation)) {
                    if (nextArgs.data) {
                        nextArgs.data = transformData(model, nextArgs.data, 'encrypt');
                    }
                    if (nextArgs.create) {
                        nextArgs.create = transformData(model, nextArgs.create, 'encrypt');
                    }
                    if (nextArgs.update) {
                        nextArgs.update = transformData(model, nextArgs.update, 'encrypt');
                    }
                }

                const result = await query(nextArgs);
                if (operation.startsWith('find') || operation === 'create' || operation === 'update' || operation === 'upsert') {
                    return transformData(model, result, 'decrypt');
                }
                return result;
            },
        },
    },
});
