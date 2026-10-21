import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { LogoutUseCase } from './Logout.usecase';
import { Session } from '../../domain/entities/Session.entity';
import { PASSWORD_SALT_ROUNDS } from '../../auth.constants';
import type { ISessionRepository } from '../../domain/repositories/ISession.repository';
import type { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import { UserEntity } from '../../../user/domain/entities/User.entity';

const user = new UserEntity('user-1', 'João Silva', 'joao@example.com', 'hashed', true, new Date(), new Date());

function makeSession(refreshHash: string, isActive = true): Session {
    const now = new Date();
    return new Session('session-1', user.id, refreshHash, isActive, new Date(now.getTime() + 60_000), now, now);
}

describe('LogoutUseCase', () => {
    let logoutUseCase: LogoutUseCase;
    let mockSessionRepository: ISessionRepository;
    let mockAuthLogger: IAuthLoggerService;

    beforeEach(() => {
        mockSessionRepository = {
            create: vi.fn(),
            update: vi.fn(),
            findById: vi.fn(),
            deactivateAllByUserId: vi.fn(),
            deleteExpired: vi.fn(),
        } as unknown as ISessionRepository;

        mockAuthLogger = {
            logAuthAction: vi.fn().mockResolvedValue(undefined),
        } as unknown as IAuthLoggerService;

        logoutUseCase = new LogoutUseCase(mockSessionRepository, mockAuthLogger);
    });

    it('verifica o secret antes de revogar: secret válido desativa a sessão', async () => {
        const session = makeSession(bcrypt.hashSync('secret-atual', PASSWORD_SALT_ROUNDS));
        vi.mocked(mockSessionRepository.findById).mockResolvedValue(session);

        await logoutUseCase.execute('session-1.secret-atual');

        const saved = vi.mocked(mockSessionRepository.update).mock.calls[0][0];
        expect(saved.isActive).toBe(false);
        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith('LOGOUT', expect.objectContaining({ userId: user.id }));
    });

    it('secret errado não revoga a sessão (impede revogar sessões alheias)', async () => {
        vi.mocked(mockSessionRepository.findById).mockResolvedValue(makeSession(bcrypt.hashSync('outro-secret', PASSWORD_SALT_ROUNDS)));

        await expect(logoutUseCase.execute('session-1.secret-errado')).resolves.toBeUndefined();

        expect(mockSessionRepository.update).not.toHaveBeenCalled();
        expect(mockAuthLogger.logAuthAction).not.toHaveBeenCalled();
    });

    it('é idempotente: token mal formado ou sessão inexistente não é erro', async () => {
        await expect(logoutUseCase.execute('sem-separador')).resolves.toBeUndefined();
        expect(mockSessionRepository.findById).not.toHaveBeenCalled();

        vi.mocked(mockSessionRepository.findById).mockResolvedValue(null);
        await expect(logoutUseCase.execute('session-1.secret')).resolves.toBeUndefined();
        expect(mockSessionRepository.update).not.toHaveBeenCalled();
    });
});
