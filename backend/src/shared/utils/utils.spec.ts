import { describe, it, expect } from 'vitest';
import { parseDurationToMs } from './duration.util';
import { mapWithConcurrency } from './concurrency.util';
import { escapeHtml } from './html.util';

describe('parseDurationToMs', () => {
    it('interpreta dias, semanas e meses', () => {
        expect(parseDurationToMs('30')).toBe(30 * 24 * 60 * 60 * 1000);
        expect(parseDurationToMs('2w')).toBe(14 * 24 * 60 * 60 * 1000);
        expect(parseDurationToMs('3 months')).toBe(90 * 24 * 60 * 60 * 1000);
    });

    it('rejeita valores inválidos', () => {
        expect(() => parseDurationToMs('')).toThrow();
        expect(() => parseDurationToMs('abc')).toThrow();
        expect(() => parseDurationToMs('0')).toThrow();
    });
});

describe('mapWithConcurrency', () => {
    it('preserva a ordem e respeita o limite', async () => {
        let running = 0;
        let maxRunning = 0;

        const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
            running += 1;
            maxRunning = Math.max(maxRunning, running);
            await new Promise((resolve) => setTimeout(resolve, 5));
            running -= 1;
            return value * 2;
        });

        expect(results).toEqual([
            { status: 'fulfilled', value: 2 },
            { status: 'fulfilled', value: 4 },
            { status: 'fulfilled', value: 6 },
            { status: 'fulfilled', value: 8 },
            { status: 'fulfilled', value: 10 },
        ]);
        expect(maxRunning).toBeLessThanOrEqual(2);
    });

    it('não cancela os restantes quando um item falha', async () => {
        const results = await mapWithConcurrency([1, 2, 3], 2, async (value) => {
            if (value === 2) throw new Error('falhou');
            return value;
        });

        expect(results[0]).toEqual({ status: 'fulfilled', value: 1 });
        expect(results[1].status).toBe('rejected');
        expect(results[2]).toEqual({ status: 'fulfilled', value: 3 });
    });
});

describe('escapeHtml', () => {
    it('escapa caracteres perigosos', () => {
        expect(escapeHtml(`<a href="x">'&`)).toBe('&lt;a href=&quot;x&quot;&gt;&#039;&amp;');
    });
});
