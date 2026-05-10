import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { EmbeddingTrackingRepository } from './repositories/embedding-tracking.repository';
import { AttachmentSourceService } from './services/attachment-source.service';
import { ChunkingService } from './services/chunking.service';
import { DocumentLoaderService } from './services/document-loader.service';
import { EmbeddingModelService } from './services/embedding-model.service';
import { EmbeddingVectorStoreService } from './services/embedding-vector-store.service';

@Module({
  imports: [StorageModule, ConfigModule, DatabaseModule],
  providers: [
    AttachmentSourceService,
    DocumentLoaderService,
    ChunkingService,
    EmbeddingModelService,
    EmbeddingVectorStoreService,
    EmbeddingTrackingRepository,
  ],
  exports: [
    AttachmentSourceService,
    DocumentLoaderService,
    ChunkingService,
    EmbeddingModelService,
    EmbeddingVectorStoreService,
    EmbeddingTrackingRepository,
  ],
})
export class EmbeddingModule {}
