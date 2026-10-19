import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { ISessionRepository } from '../../domain/repositories/ISession.repository';
import { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import { RequestMeta } from '../dtos/Login.dto';
import { splitRefreshToken } from './refreshToken.util';

@injectable()
export class LogoutUseCase {
    constructor(
        @inject(AUTH_TOKENS.ISessionRepository)
        private readonly sessionRepository: ISessionRepository,
        @inject(AUTH_TOKENS.IAuthLoggerService)
        private readonly authLogger: IAuthLoggerService
    ) {}

    // Idempotente: token inválido ou já revogado não é um erro.
    async execute(rawRefreshToken: string, meta: RequestMeta = {}): Promise<void> {
        const parts = splitRefreshToken(rawRefreshToken);
        if (!parts) return;

        const session = await this.sessionRepository.findById(parts.sessionId);
        if (!session?.isActive) return;

        // Verifica o secret antes de desativar, para impedir revogar sessões alheias.
        const validSecret = await bcrypt.compare(parts.secret, session.refreshToken);
        if (!validSecret) return;

        session.deactivate();
        await this.sessionRepository.update(session);

        await this.authLogger.logAuthAction('LOGOUT', { userId: session.userId, ...meta });
    }
}
