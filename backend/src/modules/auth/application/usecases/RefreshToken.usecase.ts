import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { ISessionRepository } from '../../domain/repositories/ISession.repository';
import { IJwtService } from '../../domain/services/IJwt.service';
import { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import { InvalidRefreshTokenError } from '../../domain/errors/InvalidRefreshToken.error';
import { LoginResponseDTO, RequestMeta } from '../dtos/Login.dto';
import { splitRefreshToken } from './refreshToken.util';
import { PASSWORD_SALT_ROUNDS } from '../../auth.constants';

@injectable()
export class RefreshTokenUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository,
        @inject(AUTH_TOKENS.ISessionRepository)
        private readonly sessionRepository: ISessionRepository,
        @inject(AUTH_TOKENS.IJwtService)
        private readonly jwtService: IJwtService,
        @inject(AUTH_TOKENS.IAuthLoggerService)
        private readonly authLogger: IAuthLoggerService
    ) {}

    async execute(rawRefreshToken: string, meta: RequestMeta = {}): Promise<LoginResponseDTO> {
        const fail = async (reason: string, userId?: string): Promise<never> => {
            await this.authLogger.logAuthAction('TOKEN_REFRESH_FAILED', { ...meta, userId, reason });
            throw new InvalidRefreshTokenError();
        };

        const parts = splitRefreshToken(rawRefreshToken);
        if (!parts) return fail('malformed_token');

        const session = await this.sessionRepository.findById(parts.sessionId);
        if (!session?.isActive) return fail('session_not_active');
        if (session.hasExpired()) return fail('session_expired', session.userId);

        const validSecret = await bcrypt.compare(parts.secret, session.refreshToken);
        if (!validSecret) {
            // Um cliente legítimo tem sempre o último secret. Um mismatch numa
            // sessão ativa indica reutilização de um token já rodado (possível
            // roubo): revoga a sessão inteira.
            session.deactivate();
            await this.sessionRepository.update(session);
            return fail('invalid_secret_reuse', session.userId);
        }

        const user = await this.userRepository.findById(session.userId);
        if (!user?.isActive) return fail('user_not_active', session.userId);

        // Rotação: novo secret + novo hash, mantendo a mesma sessão e expiração.
        const newSecret = this.jwtService.generateRefreshToken();
        const newHash = await bcrypt.hash(newSecret, PASSWORD_SALT_ROUNDS);
        session.rotate(newHash);
        await this.sessionRepository.update(session);

        const token = this.jwtService.generateToken({ userId: user.id, email: user.email });

        await this.authLogger.logAuthAction('TOKEN_REFRESH', {
            userId: user.id,
            email: user.email,
            ...meta,
        });

        return {
            token,
            refreshToken: `${session.id}.${newSecret}`,
            user: { id: user.id, name: user.name, email: user.email },
        };
    }
}
