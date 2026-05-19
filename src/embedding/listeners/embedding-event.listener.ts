import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  type ClassroomAttachmentDeletedEvent,
  type ClassroomPostAttachmentsChangedEvent,
  type ClassroomPostDeletedEvent,
  EMBEDDING_EVENTS,
  type NoticeAttachmentDeletedEventPayload,
  type NoticeAttachmentsChangedEventPayload,
  type NoticeDeletedEventPayload,
} from '../embedding.constants';
import { EmbeddingTrackingRepository } from '../repositories/embedding-tracking.repository';
import { EmbeddingJobService } from '../services/embedding-job.service';
import { EmbeddingModelService } from '../services/embedding-model.service';
import { EmbeddingVectorStoreService } from '../services/embedding-vector-store.service';

@Injectable()
export class EmbeddingEventListener {
  private readonly logger = new Logger(EmbeddingEventListener.name);

  constructor(
    private readonly jobService: EmbeddingJobService,
    private readonly trackingRepository: EmbeddingTrackingRepository,
    private readonly vectorStoreService: EmbeddingVectorStoreService,
    private readonly modelService: EmbeddingModelService,
  ) {}

  @OnEvent(EMBEDDING_EVENTS.CLASSROOM_POST_ATTACHMENTS_CHANGED)
  async handleAttachmentsChanged(event: ClassroomPostAttachmentsChangedEvent) {
    this.logger.log(
      `Handling attachments changed for post ${event.postId} (${event.attachmentIds.length} attachments)`,
    );

    for (const attachmentId of event.attachmentIds) {
      await this.jobService.enqueueAttachmentEmbedding({
        resourceType: 'classroom_post_attachment',
        organizationId: event.organizationId,
        classroomId: event.classroomId,
        postId: event.postId,
        attachmentId: attachmentId,
        requestedByUserId: event.userId,
        reason: 'created',
      });
    }
  }

  @OnEvent(EMBEDDING_EVENTS.CLASSROOM_POST_DELETED)
  async handlePostDeleted(event: ClassroomPostDeletedEvent) {
    this.logger.log(`Handling post deleted: ${event.postId}`);

    try {
      const trackingRecords = await this.trackingRepository.findByPost(
        event.postId,
      );

      for (const record of trackingRecords) {
        if (record.vectorDocumentIds && record.vectorDocumentIds.length > 0) {
          await this.vectorStoreService.deleteDocuments(
            record.vectorDocumentIds,
          );
        }
      }

      await this.trackingRepository.deleteByPost(event.postId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to handle post deletion for ${event.postId}: ${errorMessage}`,
      );
    }
  }

  @OnEvent(EMBEDDING_EVENTS.CLASSROOM_ATTACHMENT_DELETED)
  async handleAttachmentDeleted(event: ClassroomAttachmentDeletedEvent) {
    this.logger.log(
      `Handling attachment deleted: ${event.attachmentId} in post ${event.postId}`,
    );

    try {
      const trackingRecords = await this.trackingRepository.findByAttachment(
        event.postId,
        event.attachmentId,
      );

      for (const record of trackingRecords) {
        if (record.vectorDocumentIds && record.vectorDocumentIds.length > 0) {
          await this.vectorStoreService.deleteDocuments(
            record.vectorDocumentIds,
          );
        }
      }

      await this.trackingRepository.deleteByAttachment({
        postId: event.postId,
        attachmentId: event.attachmentId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to handle attachment deletion for ${event.attachmentId}: ${errorMessage}`,
      );
    }
  }

  @OnEvent(EMBEDDING_EVENTS.NOTICE_ATTACHMENTS_CHANGED)
  async handleNoticeAttachmentsChanged(
    event: NoticeAttachmentsChangedEventPayload,
  ) {
    this.logger.log(
      `Handling attachments changed for notice ${event.noticeId} (${event.attachmentIds.length} attachments)`,
    );

    for (const attachmentId of event.attachmentIds) {
      await this.jobService.enqueueAttachmentEmbedding({
        resourceType: 'notice_attachment',
        organizationId: event.organizationId,
        noticeId: event.noticeId,
        attachmentId: attachmentId,
        requestedByUserId: event.userId,
        reason: 'created',
      });
    }
  }

  @OnEvent(EMBEDDING_EVENTS.NOTICE_DELETED)
  async handleNoticeDeleted(event: NoticeDeletedEventPayload) {
    this.logger.log(`Handling notice deleted: ${event.noticeId}`);

    try {
      const trackingRecords = await this.trackingRepository.findByNotice(
        event.noticeId,
      );

      for (const record of trackingRecords) {
        if (record.vectorDocumentIds && record.vectorDocumentIds.length > 0) {
          await this.vectorStoreService.deleteDocuments(
            record.vectorDocumentIds,
          );
        }
      }

      await this.trackingRepository.deleteByNotice(event.noticeId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to handle notice deletion for ${event.noticeId}: ${errorMessage}`,
      );
    }
  }

  @OnEvent(EMBEDDING_EVENTS.NOTICE_ATTACHMENT_DELETED)
  async handleNoticeAttachmentDeleted(
    event: NoticeAttachmentDeletedEventPayload,
  ) {
    this.logger.log(
      `Handling attachment deleted: ${event.attachmentId} in notice ${event.noticeId}`,
    );

    try {
      const trackingRecords = await this.trackingRepository.findByNotice(
        event.noticeId,
      );

      for (const record of trackingRecords) {
        if (record.attachmentId === event.attachmentId) {
          if (record.vectorDocumentIds && record.vectorDocumentIds.length > 0) {
            await this.vectorStoreService.deleteDocuments(
              record.vectorDocumentIds,
            );
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to handle notice attachment deletion for ${event.attachmentId}: ${errorMessage}`,
      );
    }
  }
}
