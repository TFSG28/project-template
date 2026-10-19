export interface MailAttachment {
    filename: string;
    content: string | Buffer;
    contentType?: string;
}

export interface MailMessage {
    to: string;
    subject: string;
    html: string;
    attachments?: MailAttachment[];
}

export interface IMailService {
    /** Envia uma mensagem já renderizada. */
    send(message: MailMessage): Promise<void>;
    /** Email de recuperação de password. */
    recoveryEmail(name: string, email: string, link: string): Promise<void>;
}
