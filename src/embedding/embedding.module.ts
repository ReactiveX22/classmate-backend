import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { NoticeModule } from '../notice/notice.module';
import { ClassroomModule } from '../classroom/classroom.module';
import { StorageModule } from '../storage/storage.module';
import { EMBEDDING_QUEUE_NAME } from './embedding.constants';
import { EmbeddingEventListener } from './listeners/embedding-event.listener';
import { AttachmentEmbeddingProcessor } from './processors/attachment-embedding.processor';
import { EmbeddingTrackingRepository } from './repositories/embedding-tracking.repository';
import { AttachmentSourceService } from './services/attachment-source.service';
import { ChunkingService } from './services/chunking.service';
import { DocumentLoaderService } from './services/document-loader.service';
import { EmbeddingJobService } from './services/embedding-job.service';
import { EmbeddingModelService } from './services/embedding-model.service';
import { EmbeddingVectorStoreService } from './services/embedding-vector-store.service';

@Module({
  imports: [
    StorageModule,
    ConfigModule,
    DatabaseModule,
    NoticeModule,
    ClassroomModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url:
            configService.get<string>('QUEUE_REDIS_URL') ||
            configService.get<string>('CACHE_REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: EMBEDDING_QUEUE_NAME,
    }),
  ],
  providers: [
    AttachmentSourceService,
    DocumentLoaderService,
    ChunkingService,
    EmbeddingModelService,
    EmbeddingVectorStoreService,
    EmbeddingTrackingRepository,
    EmbeddingJobService,
    AttachmentEmbeddingProcessor,
    EmbeddingEventListener,
  ],
  exports: [
    AttachmentSourceService,
    DocumentLoaderService,
    ChunkingService,
    EmbeddingModelService,
    EmbeddingVectorStoreService,
    EmbeddingTrackingRepository,
    EmbeddingJobService,
    BullModule,
  ],
})
export class EmbeddingModule {}
