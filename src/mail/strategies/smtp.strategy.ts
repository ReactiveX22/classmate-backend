import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  MailTransporter,
  SendMailOptions,
} from '../interfaces/mail-transporter.interface';

export interface SmtpOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export class SmtpStrategy implements MailTransporter {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(SmtpStrategy.name);
  private readonly from: string;

  constructor(private readonly options: SmtpOptions) {
    this.from = options.from;
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      auth: {
        user: options.user,
        pass: options.pass,
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
      this.logger.log(
        `Email sent to ${options.to} via SMTP (${this.options.host}:${this.options.port})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to} via SMTP`,
        error.stack,
      );
      throw error;
    }
  }
}
