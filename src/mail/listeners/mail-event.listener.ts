import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail.service';
import { ResetPasswordEvent } from '../events/reset-password.event';

@Injectable()
export class MailEventListener {
  private readonly logger = new Logger(MailEventListener.name);

  constructor(private readonly mailService: MailService) {}

  @OnEvent(ResetPasswordEvent.signature)
  async handleResetPasswordEvent(event: ResetPasswordEvent) {
    const { user, url } = event;

    try {
      await this.mailService.sendTemplate(
        user.email,
        'Reset your password',
        'reset-password',
        {
          recipientName: user.name,
          resetUrl: url,
        },
      );
      this.logger.log(`Reset password email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send reset password email to ${user.email}`,
        error,
      );
    }
  }
}
