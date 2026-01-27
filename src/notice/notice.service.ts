import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type InsertNotice } from 'src/database/schema';
import { NotificationCreatedEvent } from 'src/notification/notification-created.event';
import { NoticeRepository } from './notice.repository';

@Injectable()
export class NoticeService {
  constructor(
    private readonly noticeRepository: NoticeRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createNotice(data: InsertNotice) {
    // TODO: authorization checks
    const newNotice = await this.noticeRepository.create(data);

    // TODO: emit notification event
    this.eventEmitter.emit(
      NotificationCreatedEvent.signature,
      new NotificationCreatedEvent({
        title: newNotice.title,
        content: newNotice.content,
        type: 'NOTICE',
        organizationId: newNotice.organizationId,
        recipientId: null,
      }),
    );

    return newNotice;
  }
}
