import { NestFactory } from '@nestjs/core';
import { ClassroomPostRepository } from '../../classroom/repositories/classroom-post.repository';
import { EmbeddingCommandModule } from '../embedding-command.module';
import { EmbeddingTrackingRepository } from '../repositories/embedding-tracking.repository';
import { EmbeddingJobService } from '../services/embedding-job.service';
import { EmbeddingModelService } from '../services/embedding-model.service';

async function bootstrap() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const classroomIdFilter = args
    .find((arg) => arg.startsWith('--classroomId='))
    ?.split('=')[1];

  console.log('--- Embedding Enqueue: Backfill Missing Attachments ---');
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
  const postRepository = app.get(ClassroomPostRepository);
  const trackingRepository = app.get(EmbeddingTrackingRepository);
  const modelService = app.get(EmbeddingModelService);
  const jobService = app.get(EmbeddingJobService);

  const model = modelService.modelName;
  const provider = modelService.providerName;

  console.log(`[2/3] Fetching posts for Model: ${model} (${provider})...`);
  if (classroomIdFilter) {
    console.log(`      Filtering by Classroom ID: ${classroomIdFilter}`);
  }

  const posts = await postRepository.findAllWithAttachments();

  console.log(
    `[3/3] Identifying missing items across ${posts.length} posts...`,
  );

  let enqueuedCount = 0;
  let skipCount = 0;

  for (const post of posts) {
    if (classroomIdFilter && post.classroomId !== classroomIdFilter) continue;
    if (!post.attachments || post.attachments.length === 0) continue;

    for (const attachment of post.attachments) {
      if (attachment.type !== 'file') continue;

      const tracking = await trackingRepository.findTrackingByNaturalKey({
        organizationId: post.organizationId,
        classroomId: post.classroomId,
        postId: post.id,
        attachmentId: attachment.id,
        embeddingProvider: provider,
        embeddingModel: model,
      });

      // Enqueue if missing or failed
      if (
        !tracking ||
        tracking.status === 'failed' ||
        tracking.status === 'pending'
      ) {
        if (execute) {
          await jobService.enqueueAttachmentEmbedding({
            organizationId: post.organizationId,
            classroomId: post.classroomId,
            postId: post.id,
            attachmentId: attachment.id,
            reason: tracking?.status === 'failed' ? 'retry' : 'backfill',
          });
          console.log(
            `[ENQUEUED] Post: ${post.id} | Attachment: ${attachment.id}`,
          );
        } else {
          console.log(
            `[WOULD ENQUEUE] Post: ${post.id} | Attachment: ${attachment.id}`,
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

  // Gracefully shutdown Nest (without awaiting to prevent hang in some environments)
  app.close().catch(() => {});

  // Force exit after a short delay to allow some cleanup
  setTimeout(() => process.exit(0), 100).unref();
}

bootstrap().catch((err) => {
  console.error('Enqueue failed', err);
  process.exit(1);
});
