import { createTransport } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** En-têtes List-Unsubscribe (RFC 8058). */
  unsubscribeUrl: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export const MAILER = Symbol('MAILER');

/**
 * SMTP : Mailpit en développement, Resend (smtp.resend.com) en production.
 * Le mot de passe ne vit que dans l'environnement.
 */
export function createMailer(env: NodeJS.ProcessEnv = process.env): Mailer {
  const port = Number(env.SMTP_PORT ?? 1025);
  const transport = createTransport({
    host: env.SMTP_HOST ?? 'localhost',
    port,
    secure: port === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  const from = env.MAIL_FROM ?? 'XCadence <resume@xcadence.local>';
  return {
    async send(message) {
      await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: {
          'List-Unsubscribe': `<${message.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
    },
  };
}
