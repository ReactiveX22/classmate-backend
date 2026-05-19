import { NestFactory } from '@nestjs/core';
import { NoticeRepository } from '../../notice/notice.repository';
import { EmbeddingCommandModule } from '../embedding-command.module';
import { EmbeddingTrackingRepository } from '../repositories/embedding-tracking.repository';
import { EmbeddingJobService } from '../services/embedding-job.service';
import { EmbeddingModelService } from '../services/embedding-model.service';

async function bootstrap() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const organizationIdFilter = args
    .find((arg) => arg.startsWith('--organizationId='))
    ?.split('=')[1];

  console.log('--- Embedding Enqueue: Backfill Missing Notice Attachments ---');
  if (!execute) {
    console.log(
      'DRY RUN: No jobs will be enqueued. Use --execute to run for real.',
    );
  }

  const app = await NestFactory.createApplicationContext(
    EmbeddingCommandModule,
    {
      logger: ['error', 'warn'],
    },
  );

  console.log('[1/3] Initializing job and tracking services...');
  const noticeRepository = app.get(NoticeRepository);
  const trackingRepository = app.get(EmbeddingTrackingRepository);
  const modelService = app.get(EmbeddingModelService);
  const jobService = app.get(EmbeddingJobService);

  const model = modelService.modelName;
  const provider = modelService.providerName;

  console.log(`[2/3] Fetching notices for Model: ${model} (${provider})...`);
  if (organizationIdFilter) {
    console.log(`      Filtering by Organization ID: ${organizationIdFilter}`);
  }

  const notices = await noticeRepository.findAllWithAttachments();

  console.log(
    `[3/3] Identifying missing items across ${notices.length} notices...`,
  );

  let enqueuedCount = 0;
  let skipCount = 0;

  for (const notice of notices) {
    if (organizationIdFilter && notice.organizationId !== organizationIdFilter)
      continue;
    if (!notice.attachments || notice.attachments.length === 0) continue;

    for (const attachment of notice.attachments) {
      if (attachment.type !== 'file') continue;

      const tracking = await trackingRepository.findTrackingByNaturalKey({
        organizationId: notice.organizationId,
        resourceType: 'notice_attachment',
        noticeId: notice.id,
        attachmentId: attachment.id,
        embeddingProvider: provider,
        embeddingModel: model,
      });

      if (
        !tracking ||
        tracking.status === 'failed' ||
        tracking.status === 'pending'
      ) {
        if (execute) {
          await jobService.enqueueAttachmentEmbedding({
            resourceType: 'notice_attachment',
            organizationId: notice.organizationId,
            noticeId: notice.id,
            attachmentId: attachment.id,
            reason: tracking?.status === 'failed' ? 'retry' : 'backfill',
          });
          console.log(
            `[ENQUEUED] Notice: ${notice.id} | Attachment: ${attachment.id}`,
          );
        } else {
          console.log(
            `[WOULD ENQUEUE] Notice: ${notice.id} | Attachment: ${attachment.id}`,
          );
        }
        enqueuedCount++;
      } else {
        skipCount++;
      }
    }
  }

  console.log('\n--- Final Stats ---');
  console.log(`Total enqueued/identified: ${enqueuedCount}`);
  console.log(`Already completed/skipped: ${skipCount}`);
  console.log('------------------------\n');

  app.close().catch(() => {});

  setTimeout(() => process.exit(0), 100).unref();
}

bootstrap().catch((err) => {
  console.error('Enqueue failed', err);
  process.exit(1);
});
