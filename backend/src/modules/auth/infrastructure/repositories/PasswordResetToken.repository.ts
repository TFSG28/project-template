import { injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import { PasswordResetToken as PrismaPasswordResetToken } from '../../../../generated/prisma/client';
import { PasswordResetToken } from '../../domain/entities/PasswordResetToken.entity';
import { IPasswordResetTokenRepository } from '../../domain/repositories/IPasswordResetToken.repository';

@injectable()
export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
    async create(data: PasswordResetToken): Promise<PasswordResetToken> {
        const created = await prisma.passwordResetToken.create({
            data: {
                userId: data.userId,
                token: data.token,
                expiresAt: data.expiresAt,
                createdAt: data.createdAt,
            },
        });
        return this.toDomain(created);
    }

    async find(token: string): Promise<PasswordResetToken | null> {
        const data = await prisma.passwordResetToken.findUnique({ where: { token } });
        return data ? this.toDomain(data) : null;
    }

    async delete(token: string): Promise<void> {
        await prisma.passwordResetToken.delete({ where: { token } });
    }

    async deleteByUserId(userId: string): Promise<number> {
        const result = await prisma.passwordResetToken.deleteMany({ where: { userId } });
        return result.count;
    }

    async deleteExpired(): Promise<number> {
        const result = await prisma.passwordResetToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
        return result.count;
    }

    private toDomain(data: PrismaPasswordResetToken): PasswordResetToken {
        return new PasswordResetToken(
            data.userId,
            data.token,
            data.expiresAt,
            data.createdAt
        );
    }
}
