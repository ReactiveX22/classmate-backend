import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from 'src/mail/mail.service';
import { NotificationCreatedEvent } from './notification-created.event';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly mailService: MailService,
  ) {}

  @OnEvent(NotificationCreatedEvent.signature)
  async handleNotificationCreatedEvent(event: NotificationCreatedEvent) {
    const { payload } = event;

    try {
      const notification = await this.notificationRepository.create(payload);

      if (payload.recipientEmail) {
        this.mailService
          .sendMail(
            payload.recipientEmail,
            payload.title,
            payload.content || '',
          )
          .catch((err) =>
            Logger.error('Failed to send notification email', err),
          );
      }

      return notification;
    } catch (error) {
      Logger.error('Failed to process notification event', error);
    }
  }
}
