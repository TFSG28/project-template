export class AppError extends Error {
    constructor(
        public readonly message: string,
        public readonly statusCode: number = 500,
        public readonly isOperational: boolean = true,
        /**
         * Stable, machine-readable label. Clients should branch on this instead
         * of the human-readable message (which is translated and may change).
         */
        public readonly code: string = 'INTERNAL_ERROR'
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(
        message: string,
        public readonly errors?: Record<string, string>
    ) {
        super(message, 400, true, 'VALIDATION_ERROR');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Não autorizado', code = 'UNAUTHORIZED') {
        super(message, 401, true, code);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Acesso negado', code = 'FORBIDDEN') {
        super(message, 403, true, code);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Recurso não encontrado', code = 'NOT_FOUND') {
        super(message, 404, true, code);
    }
}

export class ConflictError extends AppError {
    constructor(message: string, code = 'CONFLICT') {
        super(message, 409, true, code);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message = 'Demasiadas tentativas, tente novamente mais tarde', code = 'TOO_MANY_ATTEMPTS') {
        super(message, 429, true, code);
    }
}
