import { injectable } from 'tsyringe';
import type { Response } from 'express';
import { IRealtimeHub, RealtimeEvent } from '../../domain/services/IRealtimeHub.service';

const HEARTBEAT_MS = 25_000;

/**
 * Hub SSE em processo: mantém as respostas abertas por utilizador.
 *
 * ponytail: uma instância. Com várias réplicas, publicar num utilizador ligado
 * a outra instância exige Redis pub/sub (a interface mantém-se).
 */
@injectable()
export class RealtimeHub implements IRealtimeHub {
    private readonly clients = new Map<string, Set<Response>>();

    subscribe(userId: string, res: Response): () => void {
        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        // `retry` diz ao EventSource quanto esperar antes de reconectar.
        res.write('retry: 5000\n\n');
        this.write(res, { type: 'connected', at: new Date().toISOString() });

        let connections = this.clients.get(userId);
        if (!connections) {
            connections = new Set();
            this.clients.set(userId, connections);
        }
        connections.add(res);

        const heartbeat = setInterval(() => {
            // Comentário SSE: mantém a ligação viva sem disparar um evento.
            if (!res.writableEnded) res.write(': ping\n\n');
        }, HEARTBEAT_MS);
        heartbeat.unref?.();

        return () => {
            clearInterval(heartbeat);
            connections?.delete(res);
            if (connections?.size === 0) this.clients.delete(userId);
        };
    }

    publishToUser(userId: string, event: RealtimeEvent): void {
        const connections = this.clients.get(userId);
        if (!connections) return;

        for (const res of connections) {
            if (res.writableEnded || res.destroyed) {
                connections.delete(res);
                continue;
            }
            this.write(res, event);
        }

        if (connections.size === 0) this.clients.delete(userId);
    }

    connectionCount(): number {
        let total = 0;
        for (const connections of this.clients.values()) total += connections.size;
        return total;
    }

    private write(res: Response, event: RealtimeEvent): void {
        // Evento `message` padrão com `type` no JSON: o hook do front não
        // precisa de conhecer antecipadamente todos os tipos de evento.
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
}
