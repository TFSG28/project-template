import { Session } from '../entities/Session.entity';

export interface ISessionRepository {
    create(data: Session): Promise<Session>;
    update(data: Session): Promise<Session>;
    findById(id: string): Promise<Session | null>;
    /** Revoga todas as sessões ativas de um utilizador (reset de password). */
    deactivateAllByUserId(userId: string): Promise<number>;
    /** Remove sessões inativas ou expiradas. Devolve o total apagado. */
    deleteExpired(): Promise<number>;
}
