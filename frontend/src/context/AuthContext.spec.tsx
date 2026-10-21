import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi } from '@/services/authApi';
import { fetchClient } from '@/libs/fetchClient';

// Mock da camada de serviços; nada de rede.
vi.mock('@/services/authApi', () => ({
    authApi: {
        restoreSession: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
    },
}));

// Mock do fetchClient mantendo o resto real (ApiError, etc.).
vi.mock('@/libs/fetchClient', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/libs/fetchClient')>();
    return {
        ...actual,
        fetchClient: {
            ...actual.fetchClient,
            setCsrfToken: vi.fn(),
            clearCsrfToken: vi.fn(),
        },
    };
});

const mockUser = { id: '1', name: 'Teste', email: 'teste@exemplo.pt' };

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('restaura a sessão no mount e autentica o user', async () => {
        vi.mocked(authApi.restoreSession).mockResolvedValue(mockUser);

        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

        await act(async () => {});

        expect(result.current.user).toEqual(mockUser);
        expect(result.current.loading).toBe(false);
    });

    it('termina logged-out quando restoreSession devolve null (401/ApiError)', async () => {
        vi.mocked(authApi.restoreSession).mockResolvedValue(null);

        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

        await act(async () => {});

        expect(result.current.user).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('logout limpa o estado do user e o csrf', async () => {
        vi.mocked(authApi.restoreSession).mockResolvedValue(mockUser);
        vi.mocked(authApi.logout).mockResolvedValue(undefined);

        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
        await act(async () => {});

        expect(result.current.user).toEqual(mockUser);

        await act(async () => {
            await result.current.logout();
        });

        expect(result.current.user).toBeNull();
        expect(authApi.logout).toHaveBeenCalledTimes(1);
        expect(fetchClient.clearCsrfToken).toHaveBeenCalledTimes(1);
    });
});
