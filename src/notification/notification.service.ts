import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  constructor() {}

  @OnEvent('notification.created')
  handleNotificationCreatedEvent(payload: any) {
    Logger.debug('Notification created');
    // save to db here later after TDD
    return payload;
  }
}
