import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { IMPORT_QUEUE_NAME } from '../import.constants';
import { ImportJobPayload } from '../interfaces/import-job.interface';

@Injectable()
export class ImportJobService {
  private readonly logger = new Logger(ImportJobService.name);

  constructor(
    @InjectQueue(IMPORT_QUEUE_NAME)
    private readonly importQueue: Queue<ImportJobPayload>,
  ) {
    let lastWarnAt = 0;
    this.importQueue.on('error', (error: Error) => {
      const now = Date.now();
      if (now - lastWarnAt > 60_000) {
        lastWarnAt = now;
        this.logger.warn(`Redis unavailable: ${error.message}`);
      }
    });
  }

  async enqueueImport(payload: ImportJobPayload) {
    this.logger.log(
      `Enqueuing import job ${payload.jobId} (${payload.type}) for org ${payload.organizationId}`,
    );

    await this.importQueue.add('import', payload, {
      jobId: `import-${payload.jobId}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30000,
      },
      removeOnComplete: {
        age: 86400,
        count: 500,
      },
      removeOnFail: {
        age: 604800,
        count: 1000,
      },
    });
  }
}
