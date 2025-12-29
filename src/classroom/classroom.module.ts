import { Module } from '@nestjs/common';
import { ClassroomPaginationConfig } from 'src/classroom/classroom.config';
import { CourseModule } from 'src/course/course.module';
import { DatabaseModule } from 'src/database/database.module';
import { PaginationModule } from 'src/lib/pagination/pagination.module';
import { StorageModule } from 'src/storage/storage.module';
import { ClassroomController } from './classroom.controller';
import { ClassroomRepository } from './classroom.repository';
import { ClassroomService } from './classroom.service';
import { ClassroomPostRepository } from './repositories/classroom-post.repository';

@Module({
  imports: [CourseModule, DatabaseModule, PaginationModule, StorageModule],
  controllers: [ClassroomController],
  providers: [
    ClassroomService,
    ClassroomRepository,
    ClassroomPaginationConfig,
    ClassroomPostRepository,
  ],
  exports: [ClassroomService],
})
export class ClassroomModule {}
