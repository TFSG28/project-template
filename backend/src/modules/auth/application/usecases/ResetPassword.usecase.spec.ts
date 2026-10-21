import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { ResetPasswordUseCase } from './ResetPassword.usecase';
import { InvalidPasswordResetTokenError } from '../../domain/errors/InvalidPasswordResetToken.error';
import { PasswordResetToken } from '../../domain/entities/PasswordResetToken.entity';
import type { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetToken.repository';
import type { ISessionRepository } from '../../domain/repositories/ISession.repository';
import type { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { UserEntity } from '../../../user/domain/entities/User.entity';

const user = new UserEntity('user-1', 'João Silva', 'joao@example.com', 'hashed', true, new Date(), new Date());

function makeResetToken(expiresAt = new Date(Date.now() + 60 * 60 * 1000)): PasswordResetToken {
    return new PasswordResetToken(user.id, 'token-bruto', expiresAt, new Date());
}

describe('ResetPasswordUseCase', () => {
    let resetPasswordUseCase: ResetPasswordUseCase;
    let mockUserRepository: IUserRepository;
    let mockResetTokenRepository: IPasswordResetTokenRepository;
    let mockSessionRepository: ISessionRepository;
    let mockAuthLogger: IAuthLoggerService;

    beforeEach(() => {
        mockUserRepository = {
            findById: vi.fn(),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as IUserRepository;

        mockResetTokenRepository = {
            create: vi.fn(),
            find: vi.fn(),
            delete: vi.fn(),
            deleteByUserId: vi.fn(),
            deleteExpired: vi.fn(),
        } as unknown as IPasswordResetTokenRepository;

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

        resetPasswordUseCase = new ResetPasswordUseCase(mockUserRepository, mockResetTokenRepository, mockSessionRepository, mockAuthLogger);
    });

    it('faz reset da password e revoga todas as sessões do utilizador', async () => {
        vi.mocked(mockResetTokenRepository.find).mockResolvedValue(makeResetToken());
        vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

        await resetPasswordUseCase.execute('token-bruto', 'novaSenhaSegura123');

        const [, update] = vi.mocked(mockUserRepository.update).mock.calls[0];
        expect(update.password).not.toBe('novaSenhaSegura123');
        expect(update.password.startsWith('$2')).toBe(true);

        expect(mockResetTokenRepository.delete).toHaveBeenCalledWith('token-bruto');
        expect(mockSessionRepository.deactivateAllByUserId).toHaveBeenCalledWith(user.id);
        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith('PASSWORD_RESET', expect.objectContaining({ userId: user.id }));
    });

    it('token é de utilização única: a segunda utilização falha', async () => {
        const resetToken = makeResetToken();
        vi.mocked(mockResetTokenRepository.find).mockResolvedValueOnce(resetToken).mockResolvedValueOnce(null); // apagado após o 1.º uso
        vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

        await resetPasswordUseCase.execute('token-bruto', 'novaSenhaSegura123');
        await expect(resetPasswordUseCase.execute('token-bruto', 'outraSenhaSegura123')).rejects.toThrow(InvalidPasswordResetTokenError);

        expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
        // 1.º uso apaga o token (uso único); no 2.º uso falha logo no find.
        expect(mockResetTokenRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('token expirado é apagado e rejeitado', async () => {
        vi.mocked(mockResetTokenRepository.find).mockResolvedValue(makeResetToken(new Date(Date.now() - 1000)));

        await expect(resetPasswordUseCase.execute('token-bruto', 'novaSenhaSegura123')).rejects.toThrow(InvalidPasswordResetTokenError);

        expect(mockResetTokenRepository.delete).toHaveBeenCalledWith('token-bruto');
        expect(mockUserRepository.update).not.toHaveBeenCalled();
        expect(mockSessionRepository.deactivateAllByUserId).not.toHaveBeenCalled();
    });

    it('token desconhecido é rejeitado', async () => {
        vi.mocked(mockResetTokenRepository.find).mockResolvedValue(null);

        await expect(resetPasswordUseCase.execute('inexistente', 'novaSenhaSegura123')).rejects.toThrow(InvalidPasswordResetTokenError);

        expect(mockResetTokenRepository.delete).not.toHaveBeenCalled();
        expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('utilizador inativo é rejeitado e o token apagado', async () => {
        vi.mocked(mockResetTokenRepository.find).mockResolvedValue(makeResetToken());
        vi.mocked(mockUserRepository.findById).mockResolvedValue(new UserEntity(user.id, user.name, user.email, user.password, false, user.createdAt, user.updatedAt));

        await expect(resetPasswordUseCase.execute('token-bruto', 'novaSenhaSegura123')).rejects.toThrow(InvalidPasswordResetTokenError);

        expect(mockResetTokenRepository.delete).toHaveBeenCalledWith('token-bruto');
        expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
});
