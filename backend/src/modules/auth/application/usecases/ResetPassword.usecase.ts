import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetToken.repository';
import { ISessionRepository } from '../../domain/repositories/ISession.repository';
import { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import { InvalidPasswordResetTokenError } from '../../domain/errors/InvalidPasswordResetToken.error';
import { RequestMeta } from '../dtos/Login.dto';
import { PASSWORD_SALT_ROUNDS } from '../../auth.constants';

@injectable()
export class ResetPasswordUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository,
        @inject(AUTH_TOKENS.IPasswordResetTokenRepository)
        private readonly resetTokenRepository: IPasswordResetTokenRepository,
        @inject(AUTH_TOKENS.ISessionRepository)
        private readonly sessionRepository: ISessionRepository,
        @inject(AUTH_TOKENS.IAuthLoggerService)
        private readonly authLogger: IAuthLoggerService
    ) {}

    async execute(token: string, newPassword: string, meta: RequestMeta = {}): Promise<void> {
        const resetToken = await this.resetTokenRepository.find(token);

        if (!resetToken) throw new InvalidPasswordResetTokenError();
        if (resetToken.hasExpired()) {
            await this.resetTokenRepository.delete(token);
            throw new InvalidPasswordResetTokenError();
        }

        const user = await this.userRepository.findById(resetToken.userId);
        if (!user?.isActive) {
            await this.resetTokenRepository.delete(token);
            throw new InvalidPasswordResetTokenError();
        }

        const hashedPassword = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
        await this.userRepository.update(user.id, { password: hashedPassword });

        // Uso único + revoga todas as sessões (força novo login em todos os dispositivos).
        await this.resetTokenRepository.delete(token);
        await this.sessionRepository.deactivateAllByUserId(user.id);

        await this.authLogger.logAuthAction('PASSWORD_RESET', {
            userId: user.id,
            email: user.email,
            ...meta,
        });
    }
}
