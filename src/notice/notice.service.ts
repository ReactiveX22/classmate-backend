import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from 'src/auth/auth.factory';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { type InsertNotice } from 'src/database/schema';
import {
  EMBEDDING_EVENTS,
  type NoticeAttachmentDeletedEventPayload,
  type NoticeAttachmentsChangedEventPayload,
  type NoticeDeletedEventPayload,
} from 'src/embedding/embedding.constants';
import { NotificationCreatedEvent } from 'src/notification/notification-created.event';
import { NotificationType } from 'src/notification/notification.constants';
import { NotificationTemplate } from 'src/notification/template/notification.template';
import { StorageService } from 'src/storage/storage.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticeRepository } from './notice.repository';

@Injectable()
export class NoticeService {
  constructor(
    private readonly noticeRepository: NoticeRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: PaginationQueryDto, orgId: string) {
    return this.noticeRepository.findAll(query, orgId);
  }

  async findOne(id: string, orgId: string) {
    const notice = await this.noticeRepository.findById(orgId, id);
    if (!notice) {
      throw new ApplicationNotFoundException('Notice not found');
    }
    return notice;
  }

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
        type: NotificationType.ORGANIZATION.NOTICE,
        organizationId: newNotice.organizationId,
        recipientId: null,
        actorId: user.id,
        entityId: newNotice.id,
        actor: {
          id: user.id,
          name: user.name || '',
          image: user.image || null,
        },
      }),
    );

    if (dto.attachments && dto.attachments.length > 0) {
      this.eventEmitter.emit(EMBEDDING_EVENTS.NOTICE_ATTACHMENTS_CHANGED, {
        organizationId: newNotice.organizationId,
        noticeId: newNotice.id,
        attachmentIds: dto.attachments.map((a) => a.id),
        userId: user.id,
      });
    }

    return newNotice;
  }

  async update(id: string, dto: UpdateNoticeDto, user: User) {
    if (!user.organizationId) {
      throw new ApplicationForbiddenException('Organization not found');
    }

    const updated = await this.noticeRepository.update(
      user.organizationId,
      id,
      dto,
    );

    if (!updated) {
      throw new ApplicationNotFoundException('Notice not found');
    }

    if (dto.attachments && dto.attachments.length > 0) {
      this.eventEmitter.emit(EMBEDDING_EVENTS.NOTICE_ATTACHMENTS_CHANGED, {
        organizationId: user.organizationId,
        noticeId: updated.id,
        attachmentIds: dto.attachments.map((a) => a.id),
        userId: user.id,
      });
    }

    return updated;
  }

  async delete(id: string, user: User) {
    if (!user.organizationId) {
      throw new ApplicationForbiddenException('Organization not found');
    }

    const existing = await this.noticeRepository.findById(
      user.organizationId,
      id,
    );
    if (!existing) {
      throw new ApplicationNotFoundException('Notice not found');
    }

    this.eventEmitter.emit(EMBEDDING_EVENTS.NOTICE_DELETED, {
      organizationId: user.organizationId,
      noticeId: id,
    });

    const deleted = await this.noticeRepository.delete(user.organizationId, id);

    return deleted;
  }

  async uploadAttachment(file: Express.Multer.File, orgId: string) {
    return await this.storageService.uploadFile(
      file,
      `notice-attachments/${orgId}`,
    );
  }

  async deleteAttachment(orgId: string, attachmentId: string) {
    const notice = await this.noticeRepository.findByAttachmentId(
      orgId,
      attachmentId,
    );

    if (notice) {
      this.eventEmitter.emit(EMBEDDING_EVENTS.NOTICE_ATTACHMENT_DELETED, {
        organizationId: orgId,
        noticeId: notice.id,
        attachmentId,
      });
    }

    await this.storageService.deleteFile(
      `notice-attachments/${orgId}/${attachmentId}`,
    );
  }
}
