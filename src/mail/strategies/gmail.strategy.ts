import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  MailTransporter,
  SendMailOptions,
} from '../interfaces/mail-transporter.interface';

export class GmailStrategy implements MailTransporter {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(GmailStrategy.name);

  constructor(
    private readonly user: string,
    private readonly pass: string,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
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
      this.logger.log(`Email sent to ${options.to} via Gmail`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to} via Gmail`,
        error.stack,
      );
      throw error;
    }
  }
}
