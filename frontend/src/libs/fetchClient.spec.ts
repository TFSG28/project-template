import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchClient, ApiError } from './fetchClient';

function jsonResponse(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        clone() {
            return {
                json: async () => body,
            };
        },
    } as unknown as Response;
}

describe('fetchClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        window.sessionStorage.clear();
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('prefixa os pedidos com /api/v1', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'success', data: {} }));

        await fetchClient.get('/auth/me');

        expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/me$/);
    });

    it('renova a sessão uma vez e repete o pedido em 401', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ code: 'UNAUTHORIZED' }, 401))
            .mockResolvedValueOnce(jsonResponse({ data: { csrfToken: 'csrf-2' } }))
            .mockResolvedValueOnce(jsonResponse({ status: 'success', data: { id: '1' } }));

        const response = await fetchClient.get('/auth/me');

        expect(response.status).toBe(200);
        expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/v1\/auth\/refresh$/);
        expect(fetchMock.mock.calls[2][0]).toMatch(/\/api\/v1\/auth\/me$/);
        expect(fetchClient.getCsrfToken()).toBe('csrf-2');
    });

    it('envia o header CSRF em métodos inseguros', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'success', data: {} }));
        fetchClient.setCsrfToken('csrf-1');

        await fetchClient.post('/user', { name: 'X' });

        const init = fetchMock.mock.calls[0][1] as RequestInit;
        const headers = init.headers as Record<string, string>;
        expect(headers['X-CSRF-Token']).toBe('csrf-1');
        expect(init.credentials).toBe('include');
    });

    it('não tenta renovar em 401 de auth (login)', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ code: 'UNAUTHORIZED' }, 401));

        const response = await fetchClient.post('/auth/login', { email: 'a@b.c', password: 'x' });

        expect(response.status).toBe(401);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('expõe o code do backend', async () => {
        const response = jsonResponse({ code: 'USER_ALREADY_EXISTS' }, 409);
        await expect(fetchClient.readErrorCode(response)).resolves.toBe('USER_ALREADY_EXISTS');
        expect(new ApiError('x', 409, 'USER_ALREADY_EXISTS').code).toBe('USER_ALREADY_EXISTS');
    });
});
