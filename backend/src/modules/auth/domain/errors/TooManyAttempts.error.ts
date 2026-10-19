import { TooManyRequestsError } from '../../../../shared/errors/AppError';

export class TooManyAttemptsError extends TooManyRequestsError {
    constructor() {
        super('Demasiadas tentativas falhadas. Tenta novamente mais tarde.');
    }
}
