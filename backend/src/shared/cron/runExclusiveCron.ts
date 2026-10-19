import { randomUUID } from 'node:crypto';
import { acquireCronLock, releaseCronLock } from './cronLock';
import { logger } from '../utils/logger';

// Guarda de sobreposição em processo: evita que um novo tick comece enquanto o
// anterior ainda está a correr. O check + add são síncronos, logo não há corrida
// dentro do mesmo processo.
const runningJobs = new Set<string>();

/**
 * Executa um job cron com duas guardas:
 *  1. em processo (impede ticks sobrepostos na mesma instância);
 *  2. lock distribuído em DB (impede execução simultânea entre instâncias).
 *
 * Devolve `undefined` quando o tick é saltado. O lock é sempre libertado no
 * `finally`, mesmo que o job lance.
 */
export async function runExclusiveCron<T>(
    jobName: string,
    fn: () => Promise<T>
): Promise<T | undefined> {
    if (runningJobs.has(jobName)) {
        logger.warn({ job: jobName }, 'Cron saltado — execução anterior ainda em curso');
        return undefined;
    }
    runningJobs.add(jobName);

    const owner = `${process.pid}:${randomUUID()}`;
    let lockHeld = false;
    try {
        lockHeld = await acquireCronLock(jobName, owner);
        if (!lockHeld) {
            logger.warn({ job: jobName }, 'Cron saltado — lock detido por outra instância');
            return undefined;
        }
        return await fn();
    } finally {
        if (lockHeld) await releaseCronLock(jobName, owner);
        runningJobs.delete(jobName);
    }
}
