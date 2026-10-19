import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { RealtimeHub } from './RealtimeHub.service';

function fakeResponse() {
    const chunks: string[] = [];
    const res = {
        status: vi.fn().mockReturnThis(),
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((chunk: string) => {
            chunks.push(chunk);
            return true;
        }),
        writableEnded: false,
        destroyed: false,
    };
    return { res: res as unknown as Response, chunks };
}

describe('RealtimeHub', () => {
    it('entrega eventos apenas ao utilizador certo e limpa no unsubscribe', () => {
        const hub = new RealtimeHub();
        const alice = fakeResponse();
        const bob = fakeResponse();

        const unsubscribe = hub.subscribe('alice', alice.res);
        hub.subscribe('bob', bob.res);
        expect(hub.connectionCount()).toBe(2);

        hub.publishToUser('alice', { type: 'notification', message: 'olá' });

        expect(alice.chunks.join('')).toContain('"type":"notification"');
        expect(alice.chunks.join('')).toContain('"message":"olá"');
        expect(bob.chunks.join('')).not.toContain('notification');

        unsubscribe();
        expect(hub.connectionCount()).toBe(1);
    });
});
