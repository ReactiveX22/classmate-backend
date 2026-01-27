import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { NoticeController } from './notice.controller';
import { NoticeRepository } from './notice.repository';
import { NoticeService } from './notice.service';

@Module({
  imports: [DatabaseModule],
  providers: [NoticeService, NoticeRepository],
  controllers: [NoticeController],
})
export class NoticeModule {}
