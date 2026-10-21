import { defineConfig, devices } from '@playwright/test';

// E2E de browser do frontend: precisa do backend a correr em :3001 (com DB e
// seed — ver SETUP.md). Os webServer abaixo arranjam/reatam ambos; o pedido
// /api/v1 passa pelo proxy dev-only do next.config.ts (rewrites).
export default defineConfig({
    testDir: './src/tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:4000',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'cd ../backend && npm run dev',
            url: 'http://localhost:3001/api/v1/health',
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
        },
        {
            // Porta própria (4000): :3000 é a porta de dev habitual e pode
            // estar ocupada por outra app — reuseExistingServer adoptaria a
            // página errada e o e2e falharia com 404. NEXT_PUBLIC_API_URL
            // vazio mantém o browser same-origin (proxy do next.config), em
            // vez do cross-origin+cross-origin CORS do dev normal em :3000.
            command: 'NEXT_PUBLIC_API_URL= npm run dev -- -p 4000',
            url: 'http://localhost:4000',
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
        },
    ],
});
