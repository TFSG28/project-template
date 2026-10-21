import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { LoginUseCase } from './Login.usecase';
import { UnauthorizedError } from '../../../../shared/errors/AppError';
import { TooManyAttemptsError } from '../../domain/errors/TooManyAttempts.error';
import { PASSWORD_SALT_ROUNDS } from '../../auth.constants';
import type { ISessionRepository } from '../../domain/repositories/ISession.repository';
import type { IJwtService } from '../../domain/services/IJwt.service';
import type { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import type { ILoginBlockerService } from '../../domain/services/ILoginBlocker.service';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { UserEntity } from '../../../user/domain/entities/User.entity';

const PASSWORD = 'PasswordCerta123!';
const CORRECT_HASH = bcrypt.hashSync(PASSWORD, PASSWORD_SALT_ROUNDS);
const user = new UserEntity('user-1', 'João Silva', 'joao@example.com', CORRECT_HASH, true, new Date(), new Date());

describe('LoginUseCase', () => {
    let loginUseCase: LoginUseCase;
    let mockUserRepository: IUserRepository;
    let mockJwtService: IJwtService;
    let mockSessionRepository: ISessionRepository;
    let mockAuthLogger: IAuthLoggerService;
    let mockLoginBlocker: ILoginBlockerService;

    beforeEach(() => {
        mockUserRepository = {
            findById: vi.fn(),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;

        mockJwtService = {
            generateToken: vi.fn().mockReturnValue('access-token'),
            generateRefreshToken: vi.fn().mockReturnValue('novo-refresh-secret'),
            getRefreshTokenExpiry: vi.fn().mockReturnValue(new Date(Date.now() + 60_000)),
            generateRealtimeToken: vi.fn(),
            verifyToken: vi.fn(),
            verifyRealtimeToken: vi.fn(),
        } as unknown as IJwtService;

        mockSessionRepository = {
            create: vi.fn().mockImplementation(async (session) => session),
            update: vi.fn(),
            findById: vi.fn(),
            deactivateAllByUserId: vi.fn(),
            deleteExpired: vi.fn(),
        } as unknown as ISessionRepository;

        mockAuthLogger = {
            logAuthAction: vi.fn().mockResolvedValue(undefined),
        } as unknown as IAuthLoggerService;

        mockLoginBlocker = {
            isBlocked: vi.fn().mockResolvedValue({ blocked: false }),
            recordFailedAttempt: vi.fn().mockResolvedValue(undefined),
            clearAttempts: vi.fn().mockResolvedValue(undefined),
        } as unknown as ILoginBlockerService;

        loginUseCase = new LoginUseCase(mockUserRepository, mockJwtService, mockSessionRepository, mockAuthLogger, mockLoginBlocker);
    });

    it('emite tokens e cria a sessão com credenciais corretas', async () => {
        vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);

        const result = await loginUseCase.execute({ email: '  JOAO@example.com  ', password: PASSWORD });

        // Email normalizado antes do lookup.
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('joao@example.com');

        expect(result.token).toBe('access-token');
        expect(result.user).toEqual({ id: user.id, name: user.name, email: user.email });

        // Refresh opaco: <sessionId>.<secret>; a sessão guarda só o hash.
        const saved = vi.mocked(mockSessionRepository.create).mock.calls[0][0];
        expect(result.refreshToken).toBe(`${saved.id}.novo-refresh-secret`);
        expect(saved.userId).toBe(user.id);
        expect(saved.isActive).toBe(true);
        expect(saved.refreshToken).not.toBe('novo-refresh-secret');

        expect(mockLoginBlocker.clearAttempts).toHaveBeenCalledWith('joao@example.com', 'unknown');
        expect(mockLoginBlocker.recordFailedAttempt).not.toHaveBeenCalled();
        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith('LOGIN_SUCCESS', expect.objectContaining({ userId: user.id }));
    });

    it('palavra-passe errada falha sem criar sessão e regista a tentativa', async () => {
        vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);

        await expect(loginUseCase.execute({ email: user.email, password: 'PasswordErrada999' })).rejects.toThrow(UnauthorizedError);

        expect(mockSessionRepository.create).not.toHaveBeenCalled();
        expect(mockLoginBlocker.recordFailedAttempt).toHaveBeenCalledWith('joao@example.com', 'unknown');
        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith('LOGIN_FAILED', expect.objectContaining({ reason: 'invalid_password' }));
    });

    it('login bloqueado falha com TooManyAttempts sem tocar no fluxo de tokens', async () => {
        vi.mocked(mockLoginBlocker.isBlocked).mockResolvedValue({ blocked: true, reason: 'too_many_attempts_email' });

        await expect(loginUseCase.execute({ email: user.email, password: PASSWORD })).rejects.toThrow(TooManyAttemptsError);

        expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
        expect(mockJwtService.generateToken).not.toHaveBeenCalled();
        expect(mockSessionRepository.create).not.toHaveBeenCalled();
        expect(mockLoginBlocker.recordFailedAttempt).not.toHaveBeenCalled();
        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith('LOGIN_BLOCKED', expect.objectContaining({ reason: 'too_many_attempts_email' }));
    });
});
