import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ClassroomPaginationConfig } from '../../classroom/classroom.config';
import { PaginationService } from './pagination.service';

@Module({
  imports: [DatabaseModule],
  providers: [PaginationService, ClassroomPaginationConfig],
  exports: [PaginationService, ClassroomPaginationConfig],
})
export class PaginationModule {}
