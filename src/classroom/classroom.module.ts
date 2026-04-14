import { Module } from '@nestjs/common';

import {
  ClassroomPaginationConfig,
  SubmissionPaginationConfig,
} from 'src/classroom/classroom.config';
import { CourseModule } from 'src/course/course.module';
import { DatabaseModule } from 'src/database/database.module';
import { PaginationModule } from 'src/lib/pagination/pagination.module';
import { StorageModule } from 'src/storage/storage.module';
import { ClassroomRepository } from './classroom.repository';
import { AttendanceController } from './controllers/attendance.controller';
import { ClassroomController } from './controllers/classroom.controller';
import { CommentController } from './controllers/comment.controller';
import { PostController } from './controllers/post.controller';
import { SubmissionsController } from './controllers/submission.controller';
import { ClassroomPostCommentRepository } from './repositories/classroom-post-comment.repository';
import { AttendanceRepository } from './repositories/attendance.repository';
import { ClassroomPostRepository } from './repositories/classroom-post.repository';
import { SubmissionRepository } from './repositories/submission.repository';
import { AttendanceService } from './services/attendance.service';
import { ClassroomPostCommentService } from './services/comment.service';
import { ClassroomService } from './services/classroom.service';
import { SubmissionService } from './services/submission.service';

@Module({
  imports: [CourseModule, DatabaseModule, PaginationModule, StorageModule],
  controllers: [
    ClassroomController,
    PostController,
    SubmissionsController,
    AttendanceController,
    CommentController,
  ],
  providers: [
    ClassroomService,
    ClassroomRepository,
    ClassroomPaginationConfig,
    ClassroomPostRepository,
    ClassroomPostCommentRepository,
    SubmissionService,
    SubmissionRepository,
    SubmissionPaginationConfig,
    AttendanceService,
    AttendanceRepository,
    ClassroomPostCommentService,
  ],
  exports: [ClassroomService],
})
export class ClassroomModule {}
