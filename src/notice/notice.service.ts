import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type InsertNotice } from 'src/database/schema';
import { NotificationCreatedEvent } from 'src/notification/notification-created.event';
import { NotificationTemplate } from 'src/notification/template/notification.template';
import { NoticeRepository } from './notice.repository';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { User } from 'src/auth/auth.factory';
import { ApplicationForbiddenException } from 'src/common/exceptions/application.exception';

@Injectable()
export class NoticeService {
  constructor(
    private readonly noticeRepository: NoticeRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateNoticeDto, user: User) {
    if (!user.organizationId) {
      throw new ApplicationForbiddenException('Organization not found');
    }

    const payload: InsertNotice = {
      organizationId: user.organizationId,
      title: dto.title,
      authorId: user.id,
      content: dto.content,
      tags: dto.tags,
      attachments: dto.attachments,
    };
    const newNotice = await this.noticeRepository.create(payload);

    const formatted = NotificationTemplate.format('NOTICE', {
      entityTitle: newNotice.title,
      entityContent: newNotice.content ?? undefined,
    });

    this.eventEmitter.emit(
      NotificationCreatedEvent.signature,
      new NotificationCreatedEvent({
        title: formatted.title,
        content: formatted.content,
        type: 'NOTICE',
        organizationId: newNotice.organizationId,
        recipientId: null,
        actorId: user.id,
        entityId: newNotice.id,
      }),
    );

    return newNotice;
  }
}
