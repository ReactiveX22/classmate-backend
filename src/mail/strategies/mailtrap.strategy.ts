import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  MailTransporter,
  SendMailOptions,
} from '../interfaces/mail-transporter.interface';

export class MailtrapStrategy implements MailTransporter {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailtrapStrategy.name);

  constructor(
    private readonly user: string,
    private readonly pass: string,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: this.user,
        pass: this.pass,
      },
    });
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: options.from || this.from,
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to} via Mailtrap`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to} via Mailtrap`,
        error.stack,
      );
      throw error;
    }
  }
}
