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
  ) {}

  async enqueueAttachmentEmbedding(job: EmbedAttachmentJob) {
    const model = this.embeddingModelService.modelName;

    // Deterministic job ID to prevent duplicate queued jobs for the same attachment/model
    const jobId = `embed-classroom-post-attachment-${job.postId}-${job.attachmentId}-${model}`;

    this.logger.log(
      `Enqueuing embedding job for attachment ${job.attachmentId} in post ${job.postId} (Reason: ${job.reason})`,
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
