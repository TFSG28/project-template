import { PasswordResetToken } from '../entities/PasswordResetToken.entity';

export interface IPasswordResetTokenRepository {
    create(data: PasswordResetToken): Promise<PasswordResetToken>;
    find(token: string): Promise<PasswordResetToken | null>;
    delete(token: string): Promise<void>;
    /** Invalida pedidos anteriores do mesmo utilizador. */
    deleteByUserId(userId: string): Promise<number>;
    /** Remove tokens expirados (limpeza periódica). */
    deleteExpired(): Promise<number>;
}
