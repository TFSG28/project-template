import nodemailer, { Transporter } from 'nodemailer';
import { injectable } from 'tsyringe';
import { env } from '../../../config/env';
import { logger } from '../../utils/logger';
import { IMailService, MailMessage } from './IMail.service';
import { MailSendError } from './MailSend.error';
import { templateMailService } from './templates.service';

let sharedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
    if (!env.EMAIL || !env.EMAIL_PASS) {
        throw new MailSendError('EMAIL/EMAIL_PASS não configurados');
    }
    if (!sharedTransporter) {
        sharedTransporter = nodemailer.createTransport({
            host: env.IP_SERVER,
            port: 465,
            secure: true,
            auth: { user: env.EMAIL, pass: env.EMAIL_PASS },
        });
    }
    return sharedTransporter;
}

@injectable()
export class MailService implements IMailService {
    private resolveRecipient(to: string): string {
        // Em desenvolvimento, todos os emails vão para DEV_EMAIL (evita enviar
        // para endereços reais de utilizadores de teste). Sem DEV_EMAIL, envia
        // para o destinatário indicado.
        return env.NODE_ENV === 'production' ? to : (env.DEV_EMAIL ?? to);
    }

    async send(message: MailMessage): Promise<void> {
        try {
            await getTransporter().sendMail({
                from: `${env.BUSINESS_NAME} <${env.EMAIL}>`,
                to: this.resolveRecipient(message.to),
                subject: message.subject,
                html: message.html,
                attachments: message.attachments,
            });
        } catch (error) {
            logger.error({ err: error, to: message.to }, 'Falha ao enviar email');
            throw error instanceof MailSendError
                ? error
                : new MailSendError(error instanceof Error ? error.message : 'erro desconhecido');
        }
    }

    async recoveryEmail(name: string, email: string, link: string): Promise<void> {
        await this.send({
            to: email,
            subject: 'Recuperação de password',
            html: templateMailService.recoveryTemplate(name, link),
        });
    }
}

export const mailService = new MailService();
