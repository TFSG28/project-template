import { test, expect } from '@playwright/test';

/**
 * E2E do stream SSE (`/api/v1/realtime/stream`).
 * Os casos 401 não tocam na DB (rejeitados antes de qualquer repositório);
 * o caso feliz precisa de um utilizador seed. Credenciais por env com
 * fallback para o seed (seed.ts) — sobrescreve com E2E_EMAIL/E2E_PASSWORD.
 */
const CREDENTIALS = {
    email: process.env.E2E_EMAIL ?? 'devops@wearemateria.com',
    password: process.env.E2E_PASSWORD ?? '!QAZ2wsx',
};

const STREAM = '/api/v1/realtime/stream';

test.describe('Realtime SSE stream', () => {
    test('should reject requests without a query token', async ({ request }) => {
        const response = await request.get(STREAM);
        expect(response.status()).toBe(401);
    });

    test('should reject an invalid realtime token', async ({ request }) => {
        const response = await request.get(`${STREAM}?token=not-a-real-token`);
        expect(response.status()).toBe(401);

        // Mensagem genérica (anti-probing); detalhes só no log com correlationId.
        const body = await response.json();
        expect(JSON.stringify(body)).not.toContain('not-a-real-token');
    });

    test('should serve an SSE stream for a valid realtime token', async ({ request }) => {
        // Login guarda os cookies httpOnly no contexto do request.
        const login = await request.post('/api/v1/auth/login', {
            data: CREDENTIALS,
        });
        expect(login.ok()).toBeTruthy();

        const tokenResponse = await request.get('/api/v1/auth/stream-token');
        expect(tokenResponse.ok()).toBeTruthy();
        const { data } = await tokenResponse.json();
        expect(data.token).toBeTruthy();

        // O APIRequestContext do Playwright espera o body completo (block no
        // stream aberto, timeout). fetch do Node resolve quando os headers
        // chegam — chega para as asserções — e body.cancel() fecha o stream.
        const stream = await fetch(`http://localhost:3001${STREAM}?token=${data.token}`, {
            headers: { 'accept-encoding': 'gzip, deflate, br' },
        });
        expect(stream.status).toBe(200);
        expect(stream.headers.get('content-type')).toContain('text/event-stream');
        // compression deve excluir text/event-stream.
        expect(stream.headers.get('content-encoding')).toBeNull();
        await stream.body?.cancel();
    });
});
