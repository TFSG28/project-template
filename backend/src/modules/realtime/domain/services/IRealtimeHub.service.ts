import type { Response } from 'express';

export interface RealtimeEvent {
    type: string;
    [key: string]: unknown;
}

export interface IRealtimeHub {
    /** Liga uma resposta SSE e devolve a função de cleanup. */
    subscribe(userId: string, res: Response): () => void;
    /** Publica um evento apenas para as ligações desse utilizador. */
    publishToUser(userId: string, event: RealtimeEvent): void;
    /** Número de ligações ativas (métricas/diagnóstico). */
    connectionCount(): number;
}
