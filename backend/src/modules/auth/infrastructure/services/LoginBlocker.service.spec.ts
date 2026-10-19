import { describe, it, expect } from 'vitest';
import { LoginBlockerService } from './LoginBlocker.service';

describe('LoginBlockerService', () => {
    it('bloqueia o email após 5 falhas', async () => {
        const blocker = new LoginBlockerService();
        for (let i = 0; i < 5; i += 1) {
            expect((await blocker.isBlocked('user@example.com', '1.1.1.1')).blocked).toBe(false);
            await blocker.recordFailedAttempt('user@example.com', '1.1.1.1');
        }

        const result = await blocker.isBlocked('USER@example.com', '2.2.2.2');
        expect(result).toEqual({ blocked: true, reason: 'too_many_attempts_email' });
    });

    it('limpa as tentativas após login bem-sucedido', async () => {
        const blocker = new LoginBlockerService();
        await blocker.recordFailedAttempt('user@example.com', '1.1.1.1');
        await blocker.clearAttempts('user@example.com', '1.1.1.1');
        expect((await blocker.isBlocked('user@example.com', '1.1.1.1')).blocked).toBe(false);
    });
});
