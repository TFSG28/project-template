import { injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import { Session as PrismaSession } from '../../../../generated/prisma/client';
import { Session } from '../../domain/entities/Session.entity';
import { ISessionRepository } from '../../domain/repositories/ISession.repository';

@injectable()
export class SessionRepository implements ISessionRepository {
    async create(data: Session): Promise<Session> {
        const created = await prisma.session.create({
            data: {
                id: data.id,
                userId: data.userId,
                refreshToken: data.refreshToken,
                isActive: data.isActive,
                expiresAt: data.expiresAt,
                createdAt: data.createdAt,
                lastUsedAt: data.lastUsedAt,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        });
        return this.toDomain(created);
    }

    async update(data: Session): Promise<Session> {
        const updated = await prisma.session.update({
            where: { id: data.id },
            data: {
                refreshToken: data.refreshToken,
                isActive: data.isActive,
                lastUsedAt: data.lastUsedAt,
            },
        });
        return this.toDomain(updated);
    }

    async findById(id: string): Promise<Session | null> {
        const data = await prisma.session.findUnique({ where: { id } });
        return data ? this.toDomain(data) : null;
    }

    async deactivateAllByUserId(userId: string): Promise<number> {
        const result = await prisma.session.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false, lastUsedAt: new Date() },
        });
        return result.count;
    }

    async deleteExpired(): Promise<number> {
        const result = await prisma.session.deleteMany({
            where: {
                OR: [
                    { isActive: false },
                    { expiresAt: { lt: new Date() } },
                ],
            },
        });
        return result.count;
    }

    private toDomain(data: PrismaSession): Session {
        return new Session(
            data.id,
            data.userId,
            data.refreshToken,
            data.isActive,
            data.expiresAt,
            data.createdAt,
            data.lastUsedAt,
            data.ipAddress ?? undefined,
            data.userAgent ?? undefined
        );
    }
}
