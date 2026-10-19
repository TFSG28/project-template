import { prisma } from '../../lib/prisma';
import { logger } from '../utils/logger';

// Lease do lock distribuído: se um run demorar mais do que isto, outra
// instância pode assumir. Usa DB time (DATE_ADD(NOW(), ...)) para não depender
// do relógio de cada instância.
const CRON_LOCK_LEASE_MINUTES = 60;

// Claim atómico: INSERT ... ON DUPLICATE KEY UPDATE. Se a linha já existe e o
// lease ainda é válido, fica com o dono atual; se expirou (ou está livre),
// passa para nós. O SELECT final confirma o dono porque o affectedRows do
// ODKU é ambíguo (1 = insert, 2 = update mesmo sem mudança).
export async function acquireCronLock(name: string, owner: string): Promise<boolean> {
    try {
        await prisma.$executeRawUnsafe(
            `INSERT INTO \`CronLock\` (id, name, owner, expiresAt, createdAt, updatedAt)
             VALUES (UUID(), ?, ?, DATE_ADD(NOW(), INTERVAL ${CRON_LOCK_LEASE_MINUTES} MINUTE), NOW(), NOW())
             ON DUPLICATE KEY UPDATE
                 owner = IF(expiresAt IS NULL OR expiresAt < NOW(), VALUES(owner), owner),
                 expiresAt = IF(expiresAt IS NULL OR expiresAt < NOW(), VALUES(expiresAt), expiresAt),
                 updatedAt = IF(expiresAt IS NULL OR expiresAt < NOW(), NOW(), updatedAt)`,
            name,
            owner
        );

        const rows = await prisma.$queryRawUnsafe<Array<{ owner: string | null }>>(
            'SELECT owner FROM `CronLock` WHERE name = ? LIMIT 1',
            name
        );
        return rows[0]?.owner === owner;
    } catch (error) {
        // Fail-open: sem a tabela (db-update pendente) ou erro de DB, corre mesmo
        // assim — a guarda em processo continua a valer. Só loga o problema.
        logger.error({ err: error, job: name }, 'Cron lock indisponível; a correr sem lock distribuído');
        return true;
    }
}

// Release owner-scoped: só liberta se ainda formos os donos. Se o lease expirou
// no meio do run e outra instância assumiu, o WHERE owner = ? não casa nada e o
// lock dela fica intacto. Best-effort — se falhar, o lease expira sozinho.
export async function releaseCronLock(name: string, owner: string): Promise<void> {
    try {
        await prisma.$executeRawUnsafe(
            'UPDATE `CronLock` SET expiresAt = NULL, updatedAt = NOW() WHERE name = ? AND owner = ?',
            name,
            owner
        );
    } catch {
        // Silencioso: o lease resolve sozinho.
    }
}
