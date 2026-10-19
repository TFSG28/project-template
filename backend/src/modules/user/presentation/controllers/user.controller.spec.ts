import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { UserController } from './user.controller';
import type { CreateUserUseCase } from '../../application/usecases/CreateUser.usecase';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { errorHandler } from '../../../../shared/middleware/error-handler.middleware';
import { CreateUserSchema } from '../../application/dtos/CreateUser.dto';
import { UserAlreadyExistsError } from '../../domain/errors/UserAlreadyExists.error';

describe('UserController', () => {
  let app: Express;
  const execute = vi.fn();

  beforeEach(() => {
    execute.mockReset();
    const controller = new UserController({ execute } as unknown as CreateUserUseCase);

    app = express();
    app.use(express.json());
    app.post('/user', validate(CreateUserSchema), controller.create);
    app.use(errorHandler);
  });

  it('devolve 201 com o utilizador criado', async () => {
    execute.mockResolvedValue({
      id: '1',
      name: 'Utilizador Teste',
      email: 'teste@example.com',
      isActive: true,
      createdAt: new Date(),
    });

    const response = await request(app).post('/user').send({
      name: 'Utilizador Teste',
      email: 'teste@example.com',
      password: 'senha123',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ id: '1', email: 'teste@example.com' });
  });

  it('devolve 409 se o email já existe', async () => {
    execute.mockRejectedValue(new UserAlreadyExistsError());

    const response = await request(app).post('/user').send({
      name: 'Utilizador Teste',
      email: 'teste@example.com',
      password: 'senha123',
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('USER_ALREADY_EXISTS');
  });

  it('devolve 400 se faltar um campo obrigatório', async () => {
    const response = await request(app).post('/user').send({
      name: 'Utilizador Teste',
      password: 'senha123',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(execute).not.toHaveBeenCalled();
  });

  it('devolve 400 se o email for inválido', async () => {
    const response = await request(app).post('/user').send({
      name: 'Utilizador Teste',
      email: 'email-invalido',
      password: 'senha123',
    });

    expect(response.status).toBe(400);
  });
});
