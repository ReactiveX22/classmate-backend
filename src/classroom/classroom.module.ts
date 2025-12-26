import { Module } from '@nestjs/common';
import { CourseModule } from 'src/course/course.module';
import { DatabaseModule } from 'src/database/database.module';
import { ClassroomController } from './classroom.controller';
import { ClassroomRepository } from './classroom.repository';
import { ClassroomService } from './classroom.service';

@Module({
  imports: [CourseModule, DatabaseModule],
  controllers: [ClassroomController],
  providers: [ClassroomService, ClassroomRepository],
})
export class ClassroomModule {}
