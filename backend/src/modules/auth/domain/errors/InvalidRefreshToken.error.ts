import { UnauthorizedError } from '../../../../shared/errors/AppError';

export class InvalidRefreshTokenError extends UnauthorizedError {
    constructor() {
        super('Sessão inválida ou expirada', 'INVALID_REFRESH_TOKEN');
    }
}
