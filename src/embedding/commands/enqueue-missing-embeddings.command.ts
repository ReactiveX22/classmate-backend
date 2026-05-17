import { NestFactory } from '@nestjs/core';
import { ClassroomPostRepository } from '../../classroom/repositories/classroom-post.repository';
import { NoticeRepository } from '../../notice/notice.repository';
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
  const organizationIdFilter = args
    .find((arg) => arg.startsWith('--organizationId='))
    ?.split('=')[1];
  const resourceTypeFilter = args
    .find((arg) => arg.startsWith('--resourceType='))
    ?.split('=')[1] as 'classroom' | 'notice' | undefined;

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

  console.log('[1/4] Initializing job and tracking services...');
  const postRepository = app.get(ClassroomPostRepository);
  const noticeRepository = app.get(NoticeRepository);
  const trackingRepository = app.get(EmbeddingTrackingRepository);
  const modelService = app.get(EmbeddingModelService);
  const jobService = app.get(EmbeddingJobService);

  const model = modelService.modelName;
  const provider = modelService.providerName;

  console.log(`[2/4] Fetching resources for Model: ${model} (${provider})...`);

  let totalPosts = 0;
  let totalNotices = 0;
  let enqueuedCount = 0;
  let skipCount = 0;

  if (!resourceTypeFilter || resourceTypeFilter === 'classroom') {
    if (classroomIdFilter) {
      console.log(`      Filtering by Classroom ID: ${classroomIdFilter}`);
    }

    const posts = await postRepository.findAllWithAttachments();
    totalPosts = posts.length;

    console.log(
      `[3/4] Identifying missing classroom post attachments across ${posts.length} posts...`,
    );

    for (const post of posts) {
      if (classroomIdFilter && post.classroomId !== classroomIdFilter) continue;
      if (!post.attachments || post.attachments.length === 0) continue;

      for (const attachment of post.attachments) {
        if (attachment.type !== 'file') continue;

        const tracking = await trackingRepository.findTrackingByNaturalKey({
          organizationId: post.organizationId,
          resourceType: 'classroom_post_attachment',
          classroomId: post.classroomId,
          postId: post.id,
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
              resourceType: 'classroom_post_attachment',
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
  }

  if (!resourceTypeFilter || resourceTypeFilter === 'notice') {
    if (organizationIdFilter) {
      console.log(
        `      Filtering by Organization ID: ${organizationIdFilter}`,
      );
    }

    const notices = await noticeRepository.findAllWithAttachments();
    totalNotices = notices.length;

    console.log(
      `Identifying missing notice attachments across ${notices.length} notices...`,
    );

    for (const notice of notices) {
      if (
        organizationIdFilter &&
        notice.organizationId !== organizationIdFilter
      )
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
  }

  console.log('\n--- Final Stats ---');
  console.log(`Classroom posts scanned: ${totalPosts}`);
  console.log(`Notices scanned: ${totalNotices}`);
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
