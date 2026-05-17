import { Document } from '@langchain/core/documents';
import { v4 as uuidv4 } from 'uuid';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { ClassroomPostRepository } from '../../classroom/repositories/classroom-post.repository';
import { type DB, InjectDb } from '../../database/db.provider';
import { SelectEmbeddingTracking } from '../../database/schema/embedding-tracking-schema';
import { Attachment } from '../../database/schema/types';
import { NoticeRepository } from '../../notice/notice.repository';
import {
  EMBEDDING_DEFAULTS,
  EMBEDDING_QUEUE_NAME,
} from '../embedding.constants';
import { EmbedAttachmentJob } from '../interfaces/embedding-job.interface';
import { EmbeddingTrackingRepository } from '../repositories/embedding-tracking.repository';
import { ChunkingService, DocumentChunk } from '../services/chunking.service';
import { DocumentLoaderService } from '../services/document-loader.service';
import { EmbeddingModelService } from '../services/embedding-model.service';
import { EmbeddingVectorStoreService } from '../services/embedding-vector-store.service';
import { computeSourceHash } from '../utils/hash.util';

@Processor(EMBEDDING_QUEUE_NAME, {
  concurrency: EMBEDDING_DEFAULTS.queueConcurrency,
})
export class AttachmentEmbeddingProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(AttachmentEmbeddingProcessor.name);

  onModuleInit() {
    this.logger.log(
      `Embedding Worker started (concurrency: ${EMBEDDING_DEFAULTS.queueConcurrency})`,
    );
  }

  constructor(
    @InjectDb() private readonly db: DB,
    private readonly classroomPostRepository: ClassroomPostRepository,
    private readonly noticeRepository: NoticeRepository,
    private readonly trackingRepository: EmbeddingTrackingRepository,
    private readonly documentLoaderService: DocumentLoaderService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingModelService: EmbeddingModelService,
    private readonly vectorStoreService: EmbeddingVectorStoreService,
  ) {
    super();
  }

  async process(job: Job<EmbedAttachmentJob>): Promise<any> {
    const context = job.data;
    const model = this.embeddingModelService.modelName;
    const provider = this.embeddingModelService.providerName;

    this.logger.log(
      `Processing embedding job ${job.id} for attachment ${context.attachmentId} (${context.resourceType})`,
    );

    try {
      const attachment = await this.validateAndGetAttachment(context);
      if (!attachment) {
        await this.upsertStatus(context, 'skipped', {
          reason: 'validation_failed',
        });
        return { status: 'skipped-validation' };
      }

      const chunks = await this.loadAndChunkDocuments(attachment, context);
      if (!chunks) {
        await this.upsertStatus(context, 'skipped', {
          reason: 'empty_content',
        });
        return { status: 'skipped-empty' };
      }

      const combinedText = chunks.map((c) => c.text).join('\n');
      const sourceHash = computeSourceHash({
        attachmentId: context.attachmentId,
        text: combinedText,
        mimeType: attachment.mimeType ?? 'application/octet-stream',
        chunkSize: EMBEDDING_DEFAULTS.chunkSize,
        chunkOverlap: EMBEDDING_DEFAULTS.chunkOverlap,
        embeddingProvider: provider,
        embeddingModel: model,
      });

      if (await this.isAlreadyProcessed(context, sourceHash, chunks.length)) {
        return { status: 'skipped-idempotent' };
      }

      return await this.executePipeline(
        attachment,
        chunks,
        sourceHash,
        context,
      );
    } catch (error) {
      return await this.handleProcessError(job, error);
    }
  }

  private async validateAndGetAttachment(context: EmbedAttachmentJob) {
    const { resourceType, attachmentId, organizationId } = context;

    if (resourceType === 'classroom_post_attachment') {
      const { postId, classroomId } = context;
      const post = await this.classroomPostRepository.findById(postId!);
      if (!post || post.classroomId !== classroomId) {
        this.logger.warn(
          `Post ${postId} not found or mismatch in classroom ${classroomId}`,
        );
        await this.cleanupStaleTracking(postId!, attachmentId);
        return null;
      }

      const attachment = post.attachments?.find((a) => a.id === attachmentId);
      if (!attachment) {
        this.logger.warn(
          `Attachment ${attachmentId} not found in post ${postId}`,
        );
        await this.cleanupStaleTracking(postId!, attachmentId);
        return null;
      }

      if (attachment.type !== 'file') {
        this.logger.log(
          `Skipping attachment ${attachmentId} (Type: ${attachment.type})`,
        );
        await this.upsertStatus(context, 'skipped', {
          reason: 'unsupported_type',
          type: attachment.type,
        });
        return null;
      }

      if (
        attachment.size &&
        attachment.size > EMBEDDING_DEFAULTS.maxFileBytes
      ) {
        this.logger.warn(`File ${attachmentId} exceeds max size limit`);
        await this.upsertStatus(context, 'skipped', {
          reason: 'file_too_large',
          size: attachment.size,
        });
        return null;
      }

      return attachment;
    }

    if (resourceType === 'notice_attachment') {
      const { noticeId } = context;
      const notice = await this.noticeRepository.findById(
        organizationId,
        noticeId!,
      );
      if (!notice) {
        this.logger.warn(`Notice ${noticeId} not found`);
        await this.cleanupStaleNoticeTracking(noticeId!, attachmentId);
        return null;
      }

      const attachment = notice.attachments?.find((a) => a.id === attachmentId);
      if (!attachment) {
        this.logger.warn(
          `Attachment ${attachmentId} not found in notice ${noticeId}`,
        );
        await this.cleanupStaleNoticeTracking(noticeId!, attachmentId);
        return null;
      }

      if (attachment.type !== 'file') {
        this.logger.log(
          `Skipping attachment ${attachmentId} (Type: ${attachment.type})`,
        );
        await this.upsertStatus(context, 'skipped', {
          reason: 'unsupported_type',
          type: attachment.type,
        });
        return null;
      }

      if (
        attachment.size &&
        attachment.size > EMBEDDING_DEFAULTS.maxFileBytes
      ) {
        this.logger.warn(`File ${attachmentId} exceeds max size limit`);
        await this.upsertStatus(context, 'skipped', {
          reason: 'file_too_large',
          size: attachment.size,
        });
        return null;
      }

      return attachment;
    }

    this.logger.warn(`Unknown resource type: ${resourceType}`);
    return null;
  }

  private async loadAndChunkDocuments(
    attachment: Attachment,
    context: EmbedAttachmentJob,
  ): Promise<DocumentChunk[] | null> {
    let documents: Document[];
    try {
      documents = await this.documentLoaderService.loadDocument(attachment);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to load document ${context.attachmentId}: ${errorMessage}`,
      );
      await this.upsertStatus(
        context,
        'failed',
        undefined,
        `Loader Error: ${errorMessage}`,
      );
      return null;
    }

    if (!documents || documents.length === 0) {
      this.logger.warn(`Document ${context.attachmentId} yielded no content`);
      await this.upsertStatus(context, 'skipped', { reason: 'empty_content' });
      return null;
    }

    return await this.chunkingService.chunkDocuments(documents);
  }

  private async isAlreadyProcessed(
    context: EmbedAttachmentJob,
    sourceHash: string,
    chunkCount: number,
  ) {
    const existing = await this.trackingRepository.findTrackingByNaturalKey({
      organizationId: context.organizationId,
      resourceType: context.resourceType,
      classroomId: context.classroomId,
      postId: context.postId,
      noticeId: context.noticeId,
      attachmentId: context.attachmentId,
      embeddingProvider: this.embeddingModelService.providerName,
      embeddingModel: this.embeddingModelService.modelName,
    });

    if (
      existing &&
      existing.status === 'completed' &&
      existing.sourceHash === sourceHash &&
      existing.chunkCount === chunkCount
    ) {
      this.logger.log(
        `Skipping ${context.attachmentId} as hash and chunk count match`,
      );
      return true;
    }
    return false;
  }

  private async executePipeline(
    attachment: Attachment,
    chunks: DocumentChunk[],
    sourceHash: string,
    context: EmbedAttachmentJob,
  ) {
    const model = this.embeddingModelService.modelName;
    const provider = this.embeddingModelService.providerName;

    const tracking = await this.upsertStatus(
      context,
      'processing',
      {
        attachmentName: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
      },
      undefined,
      sourceHash,
    );

    const existing = await this.trackingRepository.findTrackingByNaturalKey({
      organizationId: context.organizationId,
      resourceType: context.resourceType,
      classroomId: context.classroomId,
      postId: context.postId,
      noticeId: context.noticeId,
      attachmentId: context.attachmentId,
      embeddingProvider: provider,
      embeddingModel: model,
    });

    if (existing?.vectorDocumentIds && existing.vectorDocumentIds.length > 0) {
      await this.vectorStoreService.deleteDocuments(existing.vectorDocumentIds);
    }

    const metadataBase = {
      resourceType: context.resourceType,
      organizationId: context.organizationId,
      attachmentId: context.attachmentId,
      attachmentName: attachment.name,
      mimeType: attachment.mimeType,
      sourceHash,
      embeddingProvider: provider,
      embeddingModel: model,
      embeddingDimensions: EMBEDDING_DEFAULTS.embeddingDimensions,
    };

    const metadata =
      context.resourceType === 'classroom_post_attachment'
        ? {
            ...metadataBase,
            classroomId: context.classroomId,
            postId: context.postId,
          }
        : {
            ...metadataBase,
            noticeId: context.noticeId,
          };

    const vectorDocs = chunks.map((chunk) => ({
      pageContent: chunk.text,
      metadata: {
        ...metadata,
        chunkIndex: chunk.index,
        chunkCount: chunks.length,
      },
    }));

    const vectorIds = chunks.map(() => uuidv4());
    await this.vectorStoreService.addDocuments(vectorDocs, vectorIds);

    await this.trackingRepository.upsertTracking({
      ...tracking,
      status: 'completed',
      vectorDocumentIds: vectorIds,
      chunkCount: chunks.length,
      processedAt: new Date(),
    });

    this.logger.log(
      `Successfully embedded ${context.attachmentId} into ${chunks.length} chunks`,
    );
    return { status: 'completed', chunks: chunks.length };
  }

  private async handleProcessError(
    job: Job<EmbedAttachmentJob>,
    error: unknown,
  ) {
    const context = job.data;
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error(
      `Failed to process job ${job.id}: ${errorMessage}`,
      error instanceof Error ? error.stack : undefined,
    );

    const existing = await this.trackingRepository.findTrackingByNaturalKey({
      organizationId: context.organizationId,
      resourceType: context.resourceType,
      classroomId: context.classroomId,
      postId: context.postId,
      noticeId: context.noticeId,
      attachmentId: context.attachmentId,
      embeddingProvider: this.embeddingModelService.providerName,
      embeddingModel: this.embeddingModelService.modelName,
    });

    if (existing) {
      await this.trackingRepository.updateStatus(
        existing.id,
        'failed',
        errorMessage,
      );
      await this.trackingRepository.incrementAttempt(existing.id);
    }

    throw error;
  }

  private async upsertStatus(
    context: EmbedAttachmentJob,
    status: SelectEmbeddingTracking['status'],
    metadata?: Record<string, unknown>,
    error?: string,
    sourceHash?: string,
  ) {
    return await this.trackingRepository.upsertTracking({
      resourceType: context.resourceType,
      organizationId: context.organizationId,
      classroomId: context.classroomId ?? null,
      postId: context.postId ?? null,
      noticeId: context.noticeId ?? null,
      attachmentId: context.attachmentId,
      embeddingProvider: this.embeddingModelService.providerName,
      embeddingModel: this.embeddingModelService.modelName,
      embeddingDimensions: EMBEDDING_DEFAULTS.embeddingDimensions,
      status,
      metadata: metadata ?? {},
      error: error ?? null,
      sourceHash: sourceHash ?? null,
    });
  }

  private async cleanupStaleTracking(postId: string, attachmentId: string) {
    const trackingRecords = await this.trackingRepository.findByAttachment(
      postId,
      attachmentId,
    );

    for (const record of trackingRecords) {
      if (record.vectorDocumentIds && record.vectorDocumentIds.length > 0) {
        await this.vectorStoreService.deleteDocuments(record.vectorDocumentIds);
      }
    }

    await this.trackingRepository.deleteByAttachment({
      postId,
      attachmentId,
    });
  }

  private async cleanupStaleNoticeTracking(
    noticeId: string,
    attachmentId: string,
  ) {
    const trackingRecords =
      await this.trackingRepository.findByNotice(noticeId);

    for (const record of trackingRecords) {
      if (record.attachmentId === attachmentId) {
        if (record.vectorDocumentIds && record.vectorDocumentIds.length > 0) {
          await this.vectorStoreService.deleteDocuments(
            record.vectorDocumentIds,
          );
        }
        await this.trackingRepository.upsertTracking({
          ...record,
          status: 'skipped',
          metadata: { ...record.metadata, reason: 'attachment_not_found' },
          error: 'Attachment not found in notice',
        });
      }
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}
