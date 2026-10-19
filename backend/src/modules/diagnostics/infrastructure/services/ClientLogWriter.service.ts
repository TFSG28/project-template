import { injectable } from 'tsyringe';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { sanitizeSegment } from '../../../../shared/storage/path.util';
import { ClientLogContext, IClientLogWriterService } from '../../domain/services/IClientLogWriter.service';

const LOG_ROOT = path.resolve(process.env.LOG_DIR || path.join(process.cwd(), 'logs', 'front'));

// Remove quebras de linha e caracteres de controlo que forjariam entradas
// falsas no log (uma mensagem com \n\n criaria linhas separadas).
function sanitizeText(input: string, max: number): string {
    return input
        .replace(/[\r\n\t]+/g, ' ')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]+/g, '')
        .slice(0, max);
}

@injectable()
export class ClientLogWriterService implements IClientLogWriterService {
    async write(context: ClientLogContext): Promise<void> {
        const userId = sanitizeSegment(context.userId) || 'unknown';
        const contextJson = context.context
            ? JSON.stringify(context.context).slice(0, 4_000)
            : '-';

        const line = [
            new Date().toISOString(),
            context.level.toUpperCase(),
            `ip=${sanitizeText(context.ipAddress, 80)}`,
            `ua=${JSON.stringify(sanitizeText(context.userAgent ?? '-', 300))}`,
            `msg=${JSON.stringify(sanitizeText(context.message, 2_000))}`,
            `ctx=${contextJson}`,
        ].join(' ');

        await mkdir(LOG_ROOT, { recursive: true });
        await appendFile(path.join(LOG_ROOT, `${userId}.log`), `${line}\n`, 'utf8');
    }
}
