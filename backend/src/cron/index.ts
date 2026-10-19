import cron from 'node-cron';
import { container } from 'tsyringe';
import { AUTH_TOKENS } from '../shared/container/tokens/auth.tokens';
import { runExclusiveCron } from '../shared/cron/runExclusiveCron';
import { CleanupExpiredAuthDataUseCase } from '../modules/auth/application/usecases/CleanupExpiredAuthData.usecase';
import { logger } from '../shared/utils/logger';

export function initCronJobs() {
    // Testes não devem deixar timers agendados.
    if (process.env.NODE_ENV === 'test') return;

    // Todos os dias às 03:00: limpa sessões e tokens de reset expirados.
    cron.schedule('0 3 * * *', async () => {
        try {
            await runExclusiveCron('auth:cleanup-expired', async () => {
                const useCase = container.resolve<CleanupExpiredAuthDataUseCase>(
                    AUTH_TOKENS.CleanupExpiredAuthDataUseCase
                );
                const { sessions, tokens } = await useCase.execute();
                logger.info({ type: 'CRON', sessions, tokens }, 'Limpeza de auth concluída');
            });
        } catch (err) {
            // Uma falha do cron (ex.: DB indisponível) não pode derrubar o
            // processo nem ficar como unhandled rejection.
            logger.error({ err, job: 'auth:cleanup-expired' }, 'Cron de limpeza falhou');
        }
    });

    logger.info('Cron jobs inicializados');
}
