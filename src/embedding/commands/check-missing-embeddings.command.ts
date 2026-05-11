import { NestFactory } from '@nestjs/core';
import { ClassroomPostRepository } from '../../classroom/repositories/classroom-post.repository';
import { EmbeddingCommandModule } from '../embedding-command.module';
import { EmbeddingTrackingRepository } from '../repositories/embedding-tracking.repository';
import { EmbeddingModelService } from '../services/embedding-model.service';

async function bootstrap() {
  console.log('--- Embedding Audit: Missing Attachments ---');

  const app = await NestFactory.createApplicationContext(
    EmbeddingCommandModule,
    {
      logger: ['error', 'warn'],
    },
  );

  console.log('[1/3] Initializing services...');
  const postRepository = app.get(ClassroomPostRepository);
  const trackingRepository = app.get(EmbeddingTrackingRepository);
  const modelService = app.get(EmbeddingModelService);

  const model = modelService.modelName;
  const provider = modelService.providerName;

  console.log(
    `[2/3] Fetching classroom posts and attachments from database...`,
  );
  const posts = await postRepository.findAllWithAttachments();

  console.log(
    `[3/3] Auditing ${posts.length} posts for Model: ${model} (${provider})...`,
  );

  let totalAttachments = 0;
  let supportedAttachments = 0;
  let completed = 0;
  let missing = 0;
  let failed = 0;
  let skipped = 0;
  let processing = 0;

  for (const post of posts) {
    if (!post.attachments || post.attachments.length === 0) continue;

    for (const attachment of post.attachments) {
      totalAttachments++;

      // Only 'file' type is supported for embedding in Phase 1
      if (attachment.type !== 'file') {
        skipped++;
        continue;
      }

      supportedAttachments++;

      const tracking = await trackingRepository.findTrackingByNaturalKey({
        organizationId: post.organizationId,
        classroomId: post.classroomId,
        postId: post.id,
        attachmentId: attachment.id,
        embeddingProvider: provider,
        embeddingModel: model,
      });

      if (!tracking) {
        missing++;
        console.log(
          `[MISSING] Post: ${post.id} | Attachment: ${attachment.id} (${attachment.name})`,
        );
      } else if (tracking.status === 'completed') {
        completed++;
      } else if (tracking.status === 'failed') {
        failed++;
        console.log(
          `[FAILED ] Post: ${post.id} | Attachment: ${attachment.id} | Error: ${tracking.error}`,
        );
      } else if (tracking.status === 'skipped') {
        skipped++;
      } else if (tracking.status === 'processing') {
        processing++;
      }
    }
  }

  console.log('\n--- Audit Results ---');
  console.log(`Total Attachments:      ${totalAttachments}`);
  console.log(`Supported Files:        ${supportedAttachments}`);
  console.log(`------------------------`);
  console.log(`Completed:              ${completed}`);
  console.log(`Missing:                ${missing}`);
  console.log(`Failed:                 ${failed}`);
  console.log(`Skipped (unsupported):  ${skipped}`);
  console.log(`Processing:             ${processing}`);
  console.log('------------------------\n');

  // Gracefully shutdown Nest (without awaiting to prevent hang in some environments)
  app.close().catch(() => {});

  // Force exit after a short delay to allow some cleanup
  setTimeout(() => process.exit(0), 100).unref();
}

bootstrap().catch((err) => {
  console.error('Audit failed', err);
  process.exit(1);
});
