import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateUserUseCase } from './CreateUser.usecase';
import { UserAlreadyExistsError } from '../../domain/errors/UserAlreadyExists.error';
import type { IUserRepository } from '../../domain/repositories/IUser.repository';

describe('CreateUserUseCase', () => {
  let createUserUseCase: CreateUserUseCase;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as IUserRepository;

    createUserUseCase = new CreateUserUseCase(mockUserRepository);
  });

  it('cria um utilizador com sucesso', async () => {
    const userData = {
      name: 'João Silva',
      email: 'joao@example.com',
      password: 'senha123',
    };

    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockUserRepository.create).mockResolvedValue({
      id: '1',
      name: userData.name,
      email: userData.email,
      password: 'hashed_password',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createUserUseCase.execute(userData);

    expect(result.email).toBe(userData.email);
    expect(result.name).toBe(userData.name);
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: expect.not.stringMatching(/^senha123$/) })
    );
  });

  it('lança erro se o utilizador já existe', async () => {
    const userData = {
      name: 'João Silva',
      email: 'existente@example.com',
      password: 'senha123',
    };

    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue({
      id: '1',
      name: 'Utilizador Existente',
      email: userData.email,
      password: 'hashed',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(createUserUseCase.execute(userData)).rejects.toThrow(UserAlreadyExistsError);
    expect(mockUserRepository.create).not.toHaveBeenCalled();
  });
});
