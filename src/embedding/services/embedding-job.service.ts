import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EMBEDDING_QUEUE_NAME } from '../embedding.constants';
import { EmbedAttachmentJob } from '../interfaces/embedding-job.interface';
import { EmbeddingModelService } from './embedding-model.service';

@Injectable()
export class EmbeddingJobService {
  private readonly logger = new Logger(EmbeddingJobService.name);

  constructor(
    @InjectQueue(EMBEDDING_QUEUE_NAME)
    private readonly embeddingQueue: Queue<EmbedAttachmentJob>,
    private readonly embeddingModelService: EmbeddingModelService,
  ) {
    // Without a listener BullMQ falls back to console.error on Redis
    // connection failures. Subscribe so we log once per minute instead.
    let lastWarnAt = 0;
    this.embeddingQueue.on('error', (error: Error) => {
      const now = Date.now();
      if (now - lastWarnAt > 60_000) {
        lastWarnAt = now;
        this.logger.warn(`Redis unavailable: ${error.message}`);
      }
    });
  }

  async enqueueAttachmentEmbedding(job: EmbedAttachmentJob) {
    const model = this.embeddingModelService.modelName;

    const resourceId =
      job.resourceType === 'classroom_post_attachment'
        ? job.postId
        : job.noticeId;

    const jobId = `embed-${job.resourceType}-${resourceId}-${job.attachmentId}-${model}`;

    this.logger.log(
      `Enqueuing embedding job for attachment ${job.attachmentId} in ${job.resourceType} ${resourceId} (Reason: ${job.reason})`,
    );

    await this.embeddingQueue.add('embed-attachment', job, {
      jobId,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 30000,
      },
      removeOnComplete: {
        age: 86400, // 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 604800, // 7 days
        count: 5000,
      },
    });
  }
}
