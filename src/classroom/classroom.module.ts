import { Module } from '@nestjs/common';
import { CourseModule } from 'src/course/course.module';
import { ClassroomPaginationConfig } from 'src/classroom/classroom.config';
import { DatabaseModule } from 'src/database/database.module';
import { PaginationModule } from 'src/lib/pagination/pagination.module';
import { ClassroomController } from './classroom.controller';
import { ClassroomRepository } from './classroom.repository';
import { ClassroomService } from './classroom.service';

@Module({
  imports: [CourseModule, DatabaseModule, PaginationModule],
  controllers: [ClassroomController],
  providers: [ClassroomService, ClassroomRepository, ClassroomPaginationConfig],
  exports: [ClassroomService],
})
export class ClassroomModule {}
