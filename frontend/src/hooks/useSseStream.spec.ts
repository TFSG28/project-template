import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSseStream } from './useSseStream';
import { authApi } from '@/services/authApi';

// Mock da camada de serviços; nada de rede.
vi.mock('@/services/authApi', () => ({
    authApi: {
        streamToken: vi.fn(),
    },
}));

// EventSource falso: guarda o url, expõe handlers e regista close().
class MockEventSource {
    static instances: MockEventSource[] = [];
    url: string;
    closed = false;
    onopen: (() => void) | null = null;
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(url: string) {
        this.url = url;
        MockEventSource.instances.push(this);
    }

    close() {
        this.closed = true;
    }
}

describe('useSseStream Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        MockEventSource.instances = [];
        vi.stubGlobal('EventSource', MockEventSource);
        vi.mocked(authApi.streamToken).mockResolvedValue('tok-1');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('liga ao endpoint SSE com o token do stream-token', async () => {
        const { result } = renderHook(() => useSseStream({ onEvent: vi.fn() }));

        await act(async () => {});

        expect(MockEventSource.instances).toHaveLength(1);
        expect(MockEventSource.instances[0].url).toMatch(/\/api\/v1\/realtime\/stream\?token=tok-1$/);

        act(() => {
            MockEventSource.instances[0].onopen?.();
        });
        expect(result.current.status).toBe('open');
    });

    it('entrega eventos message com { type, ... } ao callback', async () => {
        const onEvent = vi.fn();
        renderHook(() => useSseStream({ onEvent }));

        await act(async () => {});

        act(() => {
            MockEventSource.instances[0].onmessage?.({
                data: JSON.stringify({ type: 'ping', seq: 1 }),
            } as unknown as MessageEvent<string>);
        });

        expect(onEvent).toHaveBeenCalledTimes(1);
        expect(onEvent).toHaveBeenCalledWith({ type: 'ping', seq: 1 });
    });

    it('ignora JSON malformado e payload sem type, sem crash', async () => {
        const onEvent = vi.fn();
        renderHook(() => useSseStream({ onEvent }));

        await act(async () => {});

        act(() => {
            MockEventSource.instances[0].onmessage?.({
                data: 'não sou json',
            } as unknown as MessageEvent<string>);
            MockEventSource.instances[0].onmessage?.({
                data: JSON.stringify({ seq: 2 }),
            } as unknown as MessageEvent<string>);
        });

        expect(onEvent).not.toHaveBeenCalled();
    });

    it('fecha o EventSource no unmount', async () => {
        const { unmount } = renderHook(() => useSseStream({ onEvent: vi.fn() }));

        await act(async () => {});

        unmount();

        expect(MockEventSource.instances[0].closed).toBe(true);
    });
});
