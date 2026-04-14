import { Inject, Injectable } from '@nestjs/common';
import * as ejs from 'ejs';
import * as path from 'path';
import { MAIL_TRANSPORTER } from './interfaces/mail-transporter.interface';
import type {
  MailTransporter,
  SendMailOptions,
} from './interfaces/mail-transporter.interface';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_TRANSPORTER)
    private readonly transporter: MailTransporter,
  ) {}

  async sendMail(to: string, subject: string, body: string, html?: string) {
    await this.transporter.send({
      to,
      subject,
      body,
      html,
    });
  }

  async send(options: SendMailOptions) {
    await this.transporter.send(options);
  }

  async sendTemplate(
    to: string,
    subject: string,
    templateName: string,
    context: any,
  ) {
    const templatePath = path.join(
      process.cwd(),
      'src/mail/templates',
      `${templateName}.ejs`,
    );
    const html = await ejs.renderFile(templatePath, context);
    const body = html.replace(/<[^>]*>?/gm, ''); // Simple strip tags for text body

    await this.transporter.send({
      to,
      subject,
      body,
      html,
    });
  }
}
