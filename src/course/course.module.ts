import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { CourseController } from './controllers/course.controller';
import { CourseRepository } from './repositories/course.repository';
import { CourseService } from './services/course.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository],
  exports: [CourseService],
})
export class CourseModule {}
