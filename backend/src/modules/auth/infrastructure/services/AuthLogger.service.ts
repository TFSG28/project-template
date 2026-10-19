import { injectable } from 'tsyringe';
import { logger } from '../../../../shared/utils/logger';
import {
    AuthAction,
    AuthLogMeta,
    IAuthLoggerService,
} from '../../domain/services/IAuthLogger.service';

const FAILURE_ACTIONS: ReadonlySet<AuthAction> = new Set<AuthAction>([
    'LOGIN_FAILED',
    'LOGIN_BLOCKED',
    'TOKEN_REFRESH_FAILED',
    'RECOVERY_EMAIL_FAILED',
]);

@injectable()
export class AuthLoggerService implements IAuthLoggerService {
    async logAuthAction(action: AuthAction, meta: AuthLogMeta = {}): Promise<void> {
        const payload = {
            type: 'AUTH',
            action,
            email: meta.email,
            userId: meta.userId,
            ipAddress: meta.ipAddress ?? 'unknown',
            userAgent: meta.userAgent ?? 'unknown',
            reason: meta.reason,
        };

        if (FAILURE_ACTIONS.has(action)) {
            logger.warn(payload, `Auth ${action}`);
        } else {
            logger.info(payload, `Auth ${action}`);
        }
    }
}
