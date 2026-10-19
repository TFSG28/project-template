import { inject, injectable } from 'tsyringe';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { IJwtService } from '../../domain/services/IJwt.service';
import { ISessionRepository } from '../../domain/repositories/ISession.repository';
import { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import { ILoginBlockerService } from '../../domain/services/ILoginBlocker.service';
import { LoginDTO, LoginResponseDTO, RequestMeta } from '../dtos/Login.dto';
import { UnauthorizedError } from '../../../../shared/errors/AppError';
import { TooManyAttemptsError } from '../../domain/errors/TooManyAttempts.error';
import { Session } from '../../domain/entities/Session.entity';
import { PASSWORD_SALT_ROUNDS } from '../../auth.constants';

// Hash bcrypt gerado uma vez no arranque. Quando o utilizador não existe,
// comparamos contra este hash para que o tempo de resposta seja semelhante ao
// de um utilizador real (mitiga enumeração por timing). Não é um segredo.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomUUID(), PASSWORD_SALT_ROUNDS);

@injectable()
export class LoginUseCase {
    constructor(
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository,
        @inject(AUTH_TOKENS.IJwtService)
        private readonly jwtService: IJwtService,
        @inject(AUTH_TOKENS.ISessionRepository)
        private readonly sessionRepository: ISessionRepository,
        @inject(AUTH_TOKENS.IAuthLoggerService)
        private readonly authLogger: IAuthLoggerService,
        @inject(AUTH_TOKENS.ILoginBlockerService)
        private readonly loginBlocker: ILoginBlockerService
    ) {}

    async execute(data: LoginDTO, meta: RequestMeta = {}): Promise<LoginResponseDTO> {
        const email = data.email.trim().toLowerCase();
        const ipAddress = meta.ipAddress ?? 'unknown';

        const block = await this.loginBlocker.isBlocked(email, ipAddress);
        if (block.blocked) {
            await this.authLogger.logAuthAction('LOGIN_BLOCKED', { email, ...meta, reason: block.reason });
            throw new TooManyAttemptsError();
        }

        const user = await this.userRepository.findByEmail(email);
        const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
        const validPassword = await bcrypt.compare(data.password, passwordHash);

        if (!user || !user.isActive || !validPassword) {
            await this.loginBlocker.recordFailedAttempt(email, ipAddress);

            const reason = !user ? 'user_not_found' : !user.isActive ? 'user_inactive' : 'invalid_password';
            await this.authLogger.logAuthAction('LOGIN_FAILED', {
                email,
                userId: user?.id,
                ...meta,
                reason,
            });
            throw new UnauthorizedError('Credenciais inválidas');
        }

        await this.loginBlocker.clearAttempts(email, ipAddress);

        const token = this.jwtService.generateToken({ userId: user.id, email: user.email });

        // Refresh token opaco: o cliente recebe `<sessionId>.<secret>` e a BD
        // guarda apenas o hash bcrypt do secret.
        const sessionId = randomUUID();
        const refreshSecret = this.jwtService.generateRefreshToken();
        const hashedRefresh = await bcrypt.hash(refreshSecret, PASSWORD_SALT_ROUNDS);
        const now = new Date();

        await this.sessionRepository.create(
            new Session(
                sessionId,
                user.id,
                hashedRefresh,
                true,
                this.jwtService.getRefreshTokenExpiry(),
                now,
                now,
                meta.ipAddress,
                meta.userAgent
            )
        );

        await this.authLogger.logAuthAction('LOGIN_SUCCESS', {
            email: user.email,
            userId: user.id,
            ...meta,
        });

        return {
            token,
            refreshToken: `${sessionId}.${refreshSecret}`,
            user: { id: user.id, name: user.name, email: user.email },
        };
    }
}
