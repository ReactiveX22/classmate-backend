import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { CourseRepository } from './repositories/course.repository';
import { CourseService } from './services/course.service';

@Module({
  imports: [DatabaseModule],
  providers: [CourseService, CourseRepository],
  exports: [CourseService],
})
export class CourseModule {}

