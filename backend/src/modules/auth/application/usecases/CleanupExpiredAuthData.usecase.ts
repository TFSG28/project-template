import { inject, injectable } from 'tsyringe';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { ISessionRepository } from '../../domain/repositories/ISession.repository';
import { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetToken.repository';

export interface CleanupResult {
    sessions: number;
    tokens: number;
}

@injectable()
export class CleanupExpiredAuthDataUseCase {
    constructor(
        @inject(AUTH_TOKENS.ISessionRepository)
        private readonly sessionRepository: ISessionRepository,
        @inject(AUTH_TOKENS.IPasswordResetTokenRepository)
        private readonly resetTokenRepository: IPasswordResetTokenRepository
    ) {}

    async execute(): Promise<CleanupResult> {
        const [sessions, tokens] = await Promise.all([
            this.sessionRepository.deleteExpired(),
            this.resetTokenRepository.deleteExpired(),
        ]);
        return { sessions, tokens };
    }
}
