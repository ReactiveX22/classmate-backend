import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { PaginationModule } from 'src/lib/pagination/pagination.module';
import { UserModule } from 'src/user/user.module';
import { CourseController } from './controllers/course.controller';
import { CourseSessionController } from './controllers/course-session.controller';
import { SemesterController } from './controllers/semester.controller';
import { CourseRepository } from './repositories/course.repository';
import { CourseSessionRepository } from './repositories/course-session.repository';
import { SemesterRepository } from './repositories/semester.repository';
import { CourseService } from './services/course.service';
import { CourseSessionService } from './services/course-session.service';
import { SemesterService } from './services/semester.service';

@Module({
  imports: [DatabaseModule, UserModule, PaginationModule],
  controllers: [CourseController, CourseSessionController, SemesterController],
  providers: [
    CourseService,
    CourseSessionService,
    SemesterService,
    CourseRepository,
    CourseSessionRepository,
    SemesterRepository,
  ],
  exports: [
    CourseService,
    CourseSessionService,
    SemesterService,
    CourseRepository,
    CourseSessionRepository,
    SemesterRepository,
  ],
})
export class CourseModule {}
