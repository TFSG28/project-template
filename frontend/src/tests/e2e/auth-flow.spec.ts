import { test, expect } from '@playwright/test';

/**
 * Fluxos de auth no browser real (via proxy dev-only em next.config.ts).
 * Credenciais por env com fallback para o seed — sobrescreve com
 * E2E_EMAIL/E2E_PASSWORD. O backend precisa de DB e `npm run db-seed`.
 */
const CREDENTIALS = {
    email: process.env.E2E_EMAIL ?? 'devops@wearemateria.com',
    password: process.env.E2E_PASSWORD ?? '!QAZ2wsx',
};

test.describe('Auth flows', () => {
    test('visitante sem sessão vê o CTA de login', async ({ page }) => {
        await page.goto('/');
        // Button com href renderiza <a> → role "link".
        await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
        await expect(page.getByText('Sessão de')).not.toBeVisible();
    });

    test('credenciais inválidas mostram erro de formulário', async ({ page }) => {
        // Email fictício: não consume tentativas do utilizador seed (o login
        // blocker conta falhas e podia bloquear o utilizador real em re-runs).
        await page.goto('/login');
        await page.getByLabel('Email').fill('e2e-nao-existe@example.com');
        await page.getByLabel('Senha').fill('password-errada');
        await page.getByRole('button', { name: 'Entrar' }).click();
        // Mensagem genérica (anti-enumeração), mas sempre explícita ao utilizador.
        await expect(page.getByRole('alert')).toBeVisible();
    });

    test('login entra, mostra a sessão e o logout limpa-a', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill(CREDENTIALS.email);
        await page.getByLabel('Senha').fill(CREDENTIALS.password);
        await page.getByRole('button', { name: 'Entrar' }).click();

        // Redirect para / e badge de sessão com o nome do utilizador.
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByText('Sessão de')).toBeVisible();

        await page.getByRole('button', { name: 'Sair' }).click();
        await expect(page.getByText('Sessão de')).not.toBeVisible();
        // Após logout, o CTA de volta ao login é um link (Button com href).
        await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    });
});
