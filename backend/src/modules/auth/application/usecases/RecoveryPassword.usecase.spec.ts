import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecoveryPasswordUseCase } from './RecoveryPassword.usecase';
import { PasswordResetToken } from '../../domain/entities/PasswordResetToken.entity';
import { PASSWORD_RESET_TTL_MS } from '../../auth.constants';
import { env } from '../../../../config/env';
import type { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetToken.repository';
import type { IAuthLoggerService } from '../../domain/services/IAuthLogger.service';
import type { IMailService } from '../../../../shared/services/mail/IMail.service';
import type { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { UserEntity } from '../../../user/domain/entities/User.entity';

const user = new UserEntity('user-1', 'João Silva', 'joao@example.com', 'hashed', true, new Date(), new Date());

describe('RecoveryPasswordUseCase', () => {
    let recoveryPasswordUseCase: RecoveryPasswordUseCase;
    let mockUserRepository: IUserRepository;
    let mockResetTokenRepository: IPasswordResetTokenRepository;
    let mockMailService: IMailService;
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
            create: vi.fn().mockImplementation(async (t: PasswordResetToken) => t),
            find: vi.fn(),
            delete: vi.fn(),
            deleteByUserId: vi.fn(),
            deleteExpired: vi.fn(),
        } as unknown as IPasswordResetTokenRepository;

        mockMailService = {
            send: vi.fn(),
            recoveryEmail: vi.fn().mockResolvedValue(undefined),
        } as unknown as IMailService;

        mockAuthLogger = {
            logAuthAction: vi.fn().mockResolvedValue(undefined),
        } as unknown as IAuthLoggerService;

        recoveryPasswordUseCase = new RecoveryPasswordUseCase(mockUserRepository, mockResetTokenRepository, mockMailService, mockAuthLogger);
    });

    it('invalida tokens anteriores e emite um novo com 2h de validade', async () => {
        vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);

        await recoveryPasswordUseCase.execute('Joao@Example.com');

        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('joao@example.com');

        const created = vi.mocked(mockResetTokenRepository.create).mock.calls[0][0];
        expect(created.userId).toBe(user.id);
        expect(created.token).toMatch(/^[a-f0-9]{64}$/);
        expect(created.expiresAt.getTime() - created.createdAt.getTime()).toBe(PASSWORD_RESET_TTL_MS);

        // Uso único efetivo: pedidos anteriores do mesmo utilizador são apagados.
        expect(mockResetTokenRepository.deleteByUserId).toHaveBeenCalledWith(user.id);
        expect(mockResetTokenRepository.create).toHaveBeenCalledTimes(1);

        const link = `${env.FRONT_URL.replace(/\/+$/, '')}/reset-password?token=${created.token}`;
        expect(mockMailService.recoveryEmail).toHaveBeenCalledWith(user.name, user.email, link);
    });

    it('falha no envio do email apaga o token e mantém a resposta genérica', async () => {
        vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(user);
        vi.mocked(mockMailService.recoveryEmail).mockRejectedValue(new Error('smtp down'));

        await expect(recoveryPasswordUseCase.execute('joao@example.com')).resolves.toBeUndefined();

        expect(mockAuthLogger.logAuthAction).toHaveBeenCalledWith(
            'RECOVERY_EMAIL_FAILED',
            expect.objectContaining({ userId: user.id, reason: 'mail_send_failed' })
        );

        const created = vi.mocked(mockResetTokenRepository.create).mock.calls[0][0];
        expect(mockResetTokenRepository.delete).toHaveBeenCalledWith(created.token);
    });

    it('não revela se o email existe (anti-enumeração)', async () => {
        // Email desconhecido.
        vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
        await expect(recoveryPasswordUseCase.execute('desconhecido@example.com')).resolves.toBeUndefined();

        // Utilizador inativo: mesma resposta silenciosa.
        vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(
            new UserEntity('user-2', 'Inativo', 'inativo@example.com', 'hashed', false, new Date(), new Date())
        );
        await expect(recoveryPasswordUseCase.execute('inativo@example.com')).resolves.toBeUndefined();

        expect(mockResetTokenRepository.create).not.toHaveBeenCalled();
        expect(mockResetTokenRepository.deleteByUserId).not.toHaveBeenCalled();
        expect(mockMailService.recoveryEmail).not.toHaveBeenCalled();
        expect(mockAuthLogger.logAuthAction).not.toHaveBeenCalled();
    });
});
