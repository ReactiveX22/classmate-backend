import { EventEmitterModule } from '@nestjs/event-emitter';
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { PaginationModule } from 'src/lib/pagination/pagination.module';
import { StorageModule } from 'src/storage/storage.module';
import { NoticePaginationConfig } from './notice.config';
import { NoticeController } from './notice.controller';
import { NoticeRepository } from './notice.repository';
import { NoticeService } from './notice.service';

@Module({
  imports: [
    DatabaseModule,
    PaginationModule,
    StorageModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [NoticeService, NoticeRepository, NoticePaginationConfig],
  controllers: [NoticeController],
  exports: [NoticeRepository],
})
export class NoticeModule {}
