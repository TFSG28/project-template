import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    init: vi.fn(),
    withScope: vi.fn((cb: (scope: unknown) => void) => cb({ setTag: vi.fn() })),
    captureException: vi.fn(),
    close: vi.fn(),
}));

vi.mock('@sentry/node', () => mocks);

const TEST_DSN = 'https://public@example.ingest.sentry.io/123';

type Loaded = {
    service: typeof import('./sentry.service');
    sentry: typeof mocks;
};

// O env é parseado no import de fetch reply; resetModules garante que cada cenário
// re-parseia o .env fictício (o setup global de dotenv pode trazer SENTRY_DSN real).
async function load(dsn?: string, environment?: string) {
    if (dsn) process.env.SENTRY_DSN = dsn; else delete process.env.SENTRY_DSN;
    if (environment) process.env.SENTRY_ENVIRONMENT = environment; else delete process.env.SENTRY_ENVIRONMENT;
    vi.resetModules();
    const service = await import('./sentry.service');
    return { service, sentry: mocks } as unknown as Loaded;
}

describe('initSentry', () => {
    it('não ativa sem SENTRY_DSN (opt-in)', async () => {
        const { service, sentry } = await load();
        expect(service.initSentry()).toBe(false);
        expect(service.isSentryEnabled()).toBe(false);
        expect(sentry.init).not.toHaveBeenCalled();
    });

    it('ativa com SENTRY_DSN e usa NODE_ENV como ambiente por omissão', async () => {
        const { service, sentry } = await load(TEST_DSN);
        expect(service.initSentry()).toBe(true);
        expect(service.isSentryEnabled()).toBe(true);
        expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({
            dsn: TEST_DSN,
            environment: 'test',
        }));
    });

    it('usa SENTRY_ENVIRONMENT quando definido', async () => {
        const { service, sentry } = await load(TEST_DSN, 'staging');
        expect(service.initSentry()).toBe(true);
        expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({
            dsn: TEST_DSN,
            environment: 'staging',
        }));
    });
});

describe('captureSentryError', () => {
    beforeEach(() => {
        mocks.init.mockClear();
        mocks.withScope.mockClear();
        mocks.captureException.mockClear();
    });

    afterEach(() => {
        mocks.withScope.mockImplementation((cb: (scope: unknown) => void) => cb({ setTag: vi.fn() }));
    });

    it('não envia nada quando o Sentry está desligado', async () => {
        const { service, sentry } = await load();
        expect(service.isSentryEnabled()).toBe(false);
        service.captureSentryError(new Error(' boom'), { method: 'GET', url: '/x', correlationId: 'c1' });
        expect(sentry.captureException).not.toHaveBeenCalled();
    });

    it('captura e junta contexto de request em tags', async () => {
        const { service, sentry } = await load(TEST_DSN);
        service.initSentry();
        const setTag = vi.fn();
        mocks.withScope.mockImplementationOnce((cb: (scope: unknown) => void) => cb({ setTag }));
        const err = new TypeError('explode');
        service.captureSentryError(err, { method: 'POST', url: '/api/v1/x', correlationId: 'corr-42' });
        expect(sentry.captureException).toHaveBeenCalledWith(err);
        expect(mocks.withScope).toHaveBeenCalledTimes(1);
        expect(setTag).toHaveBeenCalledTimes(3);
        expect(setTag).toHaveBeenCalledWith('correlationId', 'corr-42');
        expect(setTag).toHaveBeenCalledWith('http.url', '/api/v1/x');
        expect(setTag).toHaveBeenCalledWith('http.method', 'POST');
    });

    it('funciona sem contexto de request', async () => {
        const { service, sentry } = await load(TEST_DSN);
        service.initSentry();
        service.captureSentryError(new Error('no request'));
        expect(sentry.captureException).toHaveBeenCalledTimes(1);
    });
});
