import { Logger } from '@nestjs/common';
import {
  MailTransporter,
  SendMailOptions,
} from '../interfaces/mail-transporter.interface';

export class NullMailStrategy implements MailTransporter {
  private readonly logger = new Logger(NullMailStrategy.name);

  // MailTransporter requires Promise<void>, so async is intentional.
  // eslint-disable-next-line @typescript-eslint/require-await
  async send(options: SendMailOptions): Promise<void> {
    this.logger.log(
      `NullMailService: Email would be sent to ${options.to} with subject "${options.subject}"`,
    );
    this.logger.debug(`Body: ${options.body}`);
  }
}
