import { ConflictError } from '../../../../shared/errors/AppError';

export class UserAlreadyExistsError extends ConflictError {
    constructor(message = 'Usuário já existe') {
        super(message, 'USER_ALREADY_EXISTS');
    }
}
