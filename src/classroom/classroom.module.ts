import { Module } from '@nestjs/common';
import { ClassroomPaginationConfig } from 'src/classroom/classroom.config';
import { CourseModule } from 'src/course/course.module';
import { DatabaseModule } from 'src/database/database.module';
import { PaginationModule } from 'src/lib/pagination/pagination.module';
import { StorageModule } from 'src/storage/storage.module';
import { ClassroomRepository } from './classroom.repository';
import { ClassroomController } from './controllers/classroom.controller';
import { SubmissionsController } from './controllers/submission.controller';
import { ClassroomPostRepository } from './repositories/classroom-post.repository';
import { SubmissionRepository } from './repositories/submission.repository';
import { ClassroomService } from './services/classroom.service';
import { SubmissionService } from './services/submission.service';

@Module({
  imports: [CourseModule, DatabaseModule, PaginationModule, StorageModule],
  controllers: [ClassroomController, SubmissionsController],
  providers: [
    ClassroomService,
    ClassroomRepository,
    ClassroomPaginationConfig,
    ClassroomPostRepository,
    SubmissionService,
    SubmissionRepository,
  ],
  exports: [ClassroomService],
})
export class ClassroomModule {}
