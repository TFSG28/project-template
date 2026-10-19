// Test setup file
// This runs before all tests.

import 'reflect-metadata';
import 'dotenv/config';
import { beforeAll, afterAll } from 'vitest';

// Testes unitários não devem depender do .env local nem de uma DB real. Os
// defaults só preenchem variáveis ausentes; um .env/CI continua a mandar.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'mysql://test:test@localhost:3306/test';
process.env.DATABASE_USER ??= 'test';
process.env.DATABASE_PASSWORD ??= 'test';
process.env.DATABASE_NAME ??= 'test';
process.env.DATABASE_HOST ??= 'localhost';
process.env.DATABASE_PORT ??= '3306';
process.env.JWT_SECRET ??= 'test-secret-'.repeat(6);
process.env.ENCRYPTION_KEY ??= 'a'.repeat(64);
process.env.FRONT_URL ??= 'http://localhost:3000';

beforeAll(() => {
  // Setup code that runs before all tests
});

afterAll(() => {
  // Cleanup code that runs after all tests
});
