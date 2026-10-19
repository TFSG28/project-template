import { inject, injectable } from 'tsyringe';
import { randomBytes } from 'node:crypto';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetToken.repository';
import { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import { IMailService } from '../../../../shared/services/mail/IMail.service';
import { PasswordResetToken } from '../../domain/entities/PasswordResetToken.entity';
import { env } from '../../../../config/env';
import { PASSWORD_RESET_TTL_MS } from '../../auth.constants';

@injectable()
export class RecoveryPasswordUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository,
        @inject(AUTH_TOKENS.IPasswordResetTokenRepository)
        private readonly resetTokenRepository: IPasswordResetTokenRepository,
        @inject(AUTH_TOKENS.IMailService)
        private readonly mailService: IMailService,
        @inject(AUTH_TOKENS.IAuthLoggerService)
        private readonly authLogger: IAuthLoggerService
    ) {}

    async execute(email: string): Promise<void> {
        const user = await this.userRepository.findByEmail(email.trim().toLowerCase());

        // Anti-enumeração: não revelar se o email existe ou está ativo.
        if (!user?.isActive) return;

        const now = new Date();
        const resetToken = new PasswordResetToken(
            user.id,
            randomBytes(32).toString('hex'),
            new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
            now
        );

        // Invalida pedidos anteriores antes de emitir o novo (uso único efetivo).
        await this.resetTokenRepository.deleteByUserId(user.id);
        await this.resetTokenRepository.create(resetToken);

        const link = `${env.FRONT_URL.replace(/\/+$/, '')}/reset-password?token=${resetToken.token}`;

        try {
            await this.mailService.recoveryEmail(user.name, user.email, link);
        } catch {
            // A falha é observável no log, mas a resposta ao cliente continua
            // genérica. O token é removido: sem email é inútil.
            await this.authLogger.logAuthAction('RECOVERY_EMAIL_FAILED', {
                userId: user.id,
                email: user.email,
                reason: 'mail_send_failed',
            });
            await this.resetTokenRepository.delete(resetToken.token);
        }
    }
}
