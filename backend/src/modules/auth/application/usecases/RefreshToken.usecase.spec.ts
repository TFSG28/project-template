import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { RefreshTokenUseCase } from './RefreshToken.usecase';
import { InvalidRefreshTokenError } from '../../domain/errors/InvalidRefreshToken.error';
import { Session } from '../../domain/entities/Session.entity';
import { PASSWORD_SALT_ROUNDS } from '../../auth.constants';
import type { ISessionRepository } from '../../domain/repositories/ISession.repository';
import type { IJwtService } from '../../domain/services/IJwt.service';
import type { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { UserEntity } from '../../../user/domain/entities/User.entity';

const user = new UserEntity('user-1', 'João Silva', 'joao@example.com', 'hashed', true, new Date(), new Date());

function makeSession(refreshHash: string, isActive = true): Session {
    const now = new Date();
    return new Session('session-1', user.id, refreshHash, isActive, new Date(now.getTime() + 60_000), now, now);
}

describe('RefreshTokenUseCase', () => {
    let refreshTokenUseCase: RefreshTokenUseCase;
    let mockUserRepository: IUserRepository;
    let mockSessionRepository: ISessionRepository;
    let mockJwtService: IJwtService;
    let mockAuthLogger: IAuthLoggerService;

    beforeEach(() => {
        mockUserRepository = {
            findById: vi.fn(),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;

        mockSessionRepository = {
            create: vi.fn(),
            update: vi.fn(),
            findById: vi.fn(),
            deactivateAllByUserId: vi.fn(),
            deleteExpired: vi.fn(),
        } as unknown as ISessionRepository;

        mockJwtService = {
            generateToken: vi.fn().mockReturnValue('access-token'),
            generateRefreshToken: vi.fn().mockReturnValue('novo-secret'),
            getRefreshTokenExpiry: vi.fn().mockReturnValue(new Date(Date.now() + 60_000)),
            generateRealtimeToken: vi.fn(),
            verifyToken: vi.fn(),
            verifyRealtimeToken: vi.fn(),
        } as unknown as IJwtService;

        mockAuthLogger = {
            logAuthAction: vi.fn().mockResolvedValue(undefined),
        } as unknown as IAuthLoggerService;

        refreshTokenUseCase = new RefreshTokenUseCase(mockUserRepository, mockSessionRepository, mockJwtService, mockAuthLogger);
    });

    it('emite novos tokens e roda o secret na mesma sessão', async () => {
        const secretAtual = 'secret-atual';
        const session = makeSession(bcrypt.hashSync(secretAtual, PASSWORD_SALT_ROUNDS));
        vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);
        vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

        const result = await refreshTokenUseCase.execute(`session-1.${secretAtual}`);

        expect(result.token).toBe('access-token');
        expect(result.refreshToken).toBe('session-1.novo-secret');
        expect(result.user).toEqual({ id: user.id, name: user.name, email: user.email });
        expect(mockJwtService.generateToken).toHaveBeenCalledWith({ userId: user.id, email: user.email });

        // Rotação: o secret guardado já não é o antigo e valida o novo.
        const saved = vi.mocked(mockSessionRepository.update).mock.calls[0][0];
        expect(saved.id).toBe(session.id);
        expect(await bcrypt.compare(secretAtual, saved.refreshToken)).toBe(false);
        expect(await bcrypt.compare('novo-secret', saved.refreshToken)).toBe(true);
    });

    it('revoga a sessão inteira ao detetar reutilização de um token já rodado', async () => {
        const session = makeSession(bcrypt.hashSync('secret-rodado', PASSWORD_SALT_ROUNDS));
        vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);

        // O cliente apresenta um secret que já não é o último da sessão.
        await expect(refreshTokenUseCase.execute('session-1.secret-superseded')).rejects.toThrow(InvalidRefreshTokenError);

        const saved = vi.mocked(mockSessionRepository.update).mock.calls[0][0];
        expect(saved.isActive).toBe(false);
        expect(mockUserRepository.findById).not.toHaveBeenCalled();
        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith(
            'TOKEN_REFRESH_FAILED',
            expect.objectContaining({ userId: user.id, reason: 'invalid_secret_reuse' })
        );
    });

    it('rejeita token mal formado sem consultar a sessão', async () => {
        await expect(refreshTokenUseCase.execute('sem-separador')).rejects.toThrow(InvalidRefreshTokenError);
        await expect(refreshTokenUseCase.execute('.secret')).rejects.toThrow(InvalidRefreshTokenError);

        expect(mockSessionRepository.findById).not.toHaveBeenCalled();
        expect(mockSessionRepository.update).not.toHaveBeenCalled();
        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith(
            'TOKEN_REFRESH_FAILED',
            expect.objectContaining({ reason: 'malformed_token' })
        );
    });

    it('rejeita sessão inexistente', async () => {
        vi.mocked(mockSessionRepository.findById).mockResolvedValue(null);

        await expect(refreshTokenUseCase.execute('session-9.qualquer')).rejects.toThrow(InvalidRefreshTokenError);
        expect(mockSessionRepository.update).not.toHaveBeenCalled();
        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith(
            'TOKEN_REFRESH_FAILED',
            expect.objectContaining({ reason: 'session_not_active' })
        );
    });

    it('rejeita sessão inativa', async () => {
        vi.mocked(mockSessionRepository.findById).mockResolvedValue(makeSession('hash', false));

        await expect(refreshTokenUseCase.execute('session-1.secret')).rejects.toThrow(InvalidRefreshTokenError);
        expect(mockSessionRepository.update).not.toHaveBeenCalled();
    });

    it('rejeita sessão expirada', async () => {
        const now = new Date();
        const expired = new Session('session-1', user.id, 'hash', true, new Date(now.getTime() - 1000), now, now);
        vi.mocked(mockSessionRepository.findById).mockResolvedValue(expired);

        await expect(refreshTokenUseCase.execute('session-1.secret')).rejects.toThrow(InvalidRefreshTokenError);

        expect(mockUserRepository.findById).not.toHaveBeenCalled();
        expect(mockSessionRepository.update).not.toHaveBeenCalled();
        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith(
            'TOKEN_REFRESH_FAILED',
            expect.objectContaining({ userId: user.id, reason: 'session_expired' })
        );
    });
});
