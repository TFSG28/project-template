import { AppError } from '../../../../shared/errors/AppError';

export class InvalidPasswordResetTokenError extends AppError {
    constructor() {
        super('Token de recuperação inválido ou expirado', 400, true, 'INVALID_RESET_TOKEN');
    }
}
