import { NestFactory } from '@nestjs/core';
import { ClassroomPostRepository } from '../../classroom/repositories/classroom-post.repository';
import { NoticeRepository } from '../../notice/notice.repository';
import { EmbeddingCommandModule } from '../embedding-command.module';
import { EmbeddingTrackingRepository } from '../repositories/embedding-tracking.repository';
import { EmbeddingModelService } from '../services/embedding-model.service';

async function bootstrap() {
  const args = process.argv.slice(2);
  const classroomIdFilter = args
    .find((arg) => arg.startsWith('--classroomId='))
    ?.split('=')[1];
  const organizationIdFilter = args
    .find((arg) => arg.startsWith('--organizationId='))
    ?.split('=')[1];
  const resourceTypeFilter = args
    .find((arg) => arg.startsWith('--resourceType='))
    ?.split('=')[1] as 'classroom' | 'notice' | undefined;

  console.log('--- Embedding Audit: Missing Attachments ---');

  const app = await NestFactory.createApplicationContext(
    EmbeddingCommandModule,
    {
      logger: ['error', 'warn'],
    },
  );

  console.log('[1/4] Initializing services...');
  const postRepository = app.get(ClassroomPostRepository);
  const noticeRepository = app.get(NoticeRepository);
  const trackingRepository = app.get(EmbeddingTrackingRepository);
  const modelService = app.get(EmbeddingModelService);

  const model = modelService.modelName;
  const provider = modelService.providerName;

  let totalAttachments = 0;
  let supportedAttachments = 0;
  let completed = 0;
  let missing = 0;
  let failed = 0;
  let skipped = 0;
  let processing = 0;

  if (!resourceTypeFilter || resourceTypeFilter === 'classroom') {
    console.log(
      `[2/4] Fetching classroom posts and attachments from database...`,
    );
    if (classroomIdFilter) {
      console.log(`      Filtering by Classroom ID: ${classroomIdFilter}`);
    }

    const posts = await postRepository.findAllWithAttachments();
    console.log(
      `[3/4] Auditing ${posts.length} classroom posts for Model: ${model} (${provider})...`,
    );

    for (const post of posts) {
      if (classroomIdFilter && post.classroomId !== classroomIdFilter) continue;
      if (!post.attachments || post.attachments.length === 0) continue;

      for (const attachment of post.attachments) {
        totalAttachments++;

        if (attachment.type !== 'file') {
          skipped++;
          continue;
        }

        supportedAttachments++;

        const tracking = await trackingRepository.findTrackingByNaturalKey({
          organizationId: post.organizationId,
          resourceType: 'classroom_post_attachment',
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
  }

  if (!resourceTypeFilter || resourceTypeFilter === 'notice') {
    console.log(`Fetching notices and attachments from database...`);
    if (organizationIdFilter) {
      console.log(
        `      Filtering by Organization ID: ${organizationIdFilter}`,
      );
    }

    const notices = await noticeRepository.findAllWithAttachments();
    console.log(
      `Auditing ${notices.length} notices for Model: ${model} (${provider})...`,
    );

    for (const notice of notices) {
      if (
        organizationIdFilter &&
        notice.organizationId !== organizationIdFilter
      )
        continue;
      if (!notice.attachments || notice.attachments.length === 0) continue;

      for (const attachment of notice.attachments) {
        totalAttachments++;

        if (attachment.type !== 'file') {
          skipped++;
          continue;
        }

        supportedAttachments++;

        const tracking = await trackingRepository.findTrackingByNaturalKey({
          organizationId: notice.organizationId,
          resourceType: 'notice_attachment',
          noticeId: notice.id,
          attachmentId: attachment.id,
          embeddingProvider: provider,
          embeddingModel: model,
        });

        if (!tracking) {
          missing++;
          console.log(
            `[MISSING] Notice: ${notice.id} | Attachment: ${attachment.id} (${attachment.name})`,
          );
        } else if (tracking.status === 'completed') {
          completed++;
        } else if (tracking.status === 'failed') {
          failed++;
          console.log(
            `[FAILED ] Notice: ${notice.id} | Attachment: ${attachment.id} | Error: ${tracking.error}`,
          );
        } else if (tracking.status === 'skipped') {
          skipped++;
        } else if (tracking.status === 'processing') {
          processing++;
        }
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

  app.close().catch(() => {});

  setTimeout(() => process.exit(0), 100).unref();
}

bootstrap().catch((err) => {
  console.error('Audit failed', err);
  process.exit(1);
});
