import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AttachmentSourceService } from './services/attachment-source.service';
import { DocumentLoaderService } from './services/document-loader.service';

@Module({
  imports: [StorageModule],
  providers: [AttachmentSourceService, DocumentLoaderService],
  exports: [AttachmentSourceService, DocumentLoaderService],
})
export class EmbeddingModule {}
