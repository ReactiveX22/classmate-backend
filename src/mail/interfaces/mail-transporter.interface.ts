export interface SendMailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
  html?: string;
}

export interface MailTransporter {
  send(options: SendMailOptions): Promise<void>;
}

export const MAIL_TRANSPORTER = 'MAIL_TRANSPORTER';
