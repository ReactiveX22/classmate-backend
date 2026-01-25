import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type InsertNotification } from 'src/database/schema';
import { MailService } from 'src/mail/mail.service';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly mailService: MailService,
  ) {}

  @OnEvent('notification.created')
  async handleNotificationCreatedEvent(
    payload: InsertNotification & {
      recipientEmail?: string;
      recipientName?: string;
    },
  ) {
    const notification = await this.notificationRepository.create(payload);

    if (payload.recipientEmail) {
      this.mailService
        .sendMail(payload.recipientEmail, payload.title, payload.content || '')
        .catch((err) => Logger.error('Failed to send notification email', err));
    }

    return notification;
  }
}
