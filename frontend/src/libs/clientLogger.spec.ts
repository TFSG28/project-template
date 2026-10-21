import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logClientError, logClientWarn } from './clientLogger';

describe('clientLogger', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('envia o payload JSON para o endpoint de diagnóstico', () => {
        logClientError('payload-test', { a: 1 });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/diagnostics\/client-log$/);
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body)).toEqual({
            level: 'error',
            message: 'payload-test',
            context: { a: 1 },
            userAgent: navigator.userAgent,
        });
    });

    it('deduplica a mesma mensagem; nível diferente envia de novo', () => {
        logClientError('dup-test');
        logClientError('dup-test');

        expect(fetchMock).toHaveBeenCalledTimes(1);

        logClientWarn('dup-test');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        const init = fetchMock.mock.calls[1][1];
        expect(JSON.parse(init.body).level).toBe('warn');
    });

    it('normaliza context que não é objeto para null', () => {
        logClientWarn('ctx-test', 'not-an-object');

        const init = fetchMock.mock.calls[0][1];
        expect(JSON.parse(init.body).context).toBeNull();
    });
});
