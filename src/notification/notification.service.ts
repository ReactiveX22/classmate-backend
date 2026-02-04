import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from 'src/mail/mail.service';
import { NotificationCreatedEvent } from './notification-created.event';
import { isClassroomType, isOrganizationType } from './notification.constants';
import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';

import { ClassroomService } from 'src/classroom/services/classroom.service';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

import { NotificationResponse } from './types/notification-response.type';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationGateway: NotificationGateway,
    private readonly mailService: MailService,
    private readonly classroomService: ClassroomService,
  ) {}

  async findAll(query: PaginationQueryDto, userId: string, orgId: string) {
    const classroomIds =
      await this.classroomService.findUserClassroomIds(userId);

    return this.notificationRepository.findAll(
      query,
      userId,
      orgId,
      classroomIds,
    );
  }

  @OnEvent(NotificationCreatedEvent.signature)
  async handleNotificationCreatedEvent(event: NotificationCreatedEvent) {
    const { payload } = event;

    try {
      const notification = await this.notificationRepository.create(payload);

      const response: NotificationResponse = {
        notification,
        actor: payload.actor || null,
        readAt: null,
        isRead: false,
      };

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

      if (isClassroomType(payload.type)) {
        if (!payload.entityId) {
          Logger.error(
            `Notification type is ${payload.type} but entityId is missing`,
          );
          return;
        }

        this.notificationGateway.sendNotificationToClassroom(
          payload.entityId,
          response,
        );
      }

      if (isOrganizationType(payload.type)) {
        if (!payload.organizationId) {
          Logger.error(
            `Notification type is ${payload.type} but organizationId is missing`,
          );
          return;
        }

        this.notificationGateway.sendNotificationToOrganization(
          payload.organizationId,
          response,
        );
      }
    } catch (error) {
      Logger.error('Failed to process notification event', error);
    }
  }
}
