import { AppError } from '../../errors/AppError';

/** Falha ao entregar um email ao fornecedor SMTP. */
export class MailSendError extends AppError {
    constructor(cause?: string) {
        super(cause ? `Falha ao enviar email: ${cause}` : 'Falha ao enviar email', 502, true, 'MAIL_SEND_FAILED');
    }
}
