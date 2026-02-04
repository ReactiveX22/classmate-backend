import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from 'src/mail/mail.service';
import { NotificationCreatedEvent } from './notification-created.event';
import {
  NotificationType,
  isClassroomType,
  isOrganizationType,
} from './notification.constants';
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

  private readonly logger = new Logger(NotificationService.name);

  private readonly emailEligibleTypes = [
    NotificationType.CLASSROOM.ASSIGNMENT,
    NotificationType.CLASSROOM.GRADE,
    NotificationType.CLASSROOM.ANNOUNCEMENT,
    NotificationType.ORGANIZATION.NOTICE,
  ];

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

  async markAsRead(notificationId: string, userId: string) {
    await this.notificationRepository.markAsRead(notificationId, userId);
    return { success: true };
  }

  async markAllAsRead(userId: string, orgId: string) {
    const classroomIds =
      await this.classroomService.findUserClassroomIds(userId);

    const result = await this.notificationRepository.markAllAsRead(
      userId,
      orgId,
      classroomIds,
    );

    return {
      success: true,
      count: result.rowCount,
    };
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

      if (
        payload.recipientEmail &&
        this.emailEligibleTypes.includes(payload.type as any)
      ) {
        this.mailService
          .sendTemplate(payload.recipientEmail, payload.title, 'notification', {
            recipientName: payload.recipientName,
            subject: payload.title,
            content: payload.content || '',
          })
          .catch((err) =>
            this.logger.error('Failed to send notification email', err),
          );
      }

      if (isClassroomType(payload.type)) {
        if (!payload.entityId) {
          this.logger.error(
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
          this.logger.error(
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
      this.logger.error('Failed to process notification event', error);
    }
  }
}
