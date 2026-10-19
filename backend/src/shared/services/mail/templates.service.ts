import { env } from '../../../config/env';
import { escapeHtml } from '../../utils/html.util';

/**
 * Templates de email do template. Simples e sem imagens externas: funcionam
 * com clientes que bloqueiam imagens e não dependem de um CDN.
 */
export class TemplateMailService {
    baseTemplate(content: string, subject: string): string {
        const businessName = escapeHtml(env.BUSINESS_NAME);
        return `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="color-scheme" content="light">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 0; background: #f4f5f7; color: #171717; line-height: 1.6; }
        .container { max-width: 560px; background: #ffffff; margin: 32px auto; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
        .bar { height: 4px; background: #171717; }
        .header { padding: 28px 32px 20px; border-bottom: 1px solid #e5e7eb; }
        .brand { font-size: 18px; font-weight: 700; margin: 0; color: #171717; }
        .subject { font-size: 15px; color: #6b7280; margin: 6px 0 0; }
        .content { padding: 28px 32px; }
        .greeting { font-size: 20px; font-weight: 700; margin: 0 0 16px; }
        p { color: #4b5563; font-size: 15px; margin: 0 0 10px; }
        .button { display: inline-block; background: #171717; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 12px 0; }
        .footer { padding: 20px 32px; color: #9ca3af; font-size: 12px; text-align: center; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="bar"></div>
        <div class="header">
            <p class="brand">${businessName}</p>
            <p class="subject">${escapeHtml(subject)}</p>
        </div>
        <div class="content">${content}</div>
        <div class="footer">&copy; ${new Date().getFullYear()} ${businessName}</div>
    </div>
</body>
</html>`;
    }

    recoveryTemplate(name: string, link: string): string {
        const content = `
            <p class="greeting">Olá, ${escapeHtml(name)}</p>
            <p>Foi pedida a recuperação da password da tua conta.</p>
            <p>O link é válido durante <strong>2 horas</strong>.</p>
            <a class="button" href="${escapeHtml(link)}">Definir nova password</a>
            <p style="margin-top: 20px; font-size: 13px;">Se não pediste isto, ignora este email.</p>
        `;
        return this.baseTemplate(content, 'Recuperação de password');
    }
}

export const templateMailService = new TemplateMailService();
