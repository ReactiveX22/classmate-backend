import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { PaginationModule } from 'src/lib/pagination/pagination.module';
import { StudentController } from './controllers/student.controller';
import { TeacherController } from './controllers/teacher.controller';
import { StudentRepository } from './repositories/student.repository';
import { TeacherRepository } from './repositories/teacher.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { UserRepository } from './repositories/user.repository';
import { StudentService } from './services/student.service';
import { TeacherService } from './services/teacher.service';
import { UserService } from './services/user.service';

@Module({
  imports: [DatabaseModule, PaginationModule],
  controllers: [StudentController, TeacherController],
  providers: [
    UserService,
    TeacherService,
    StudentService,
    UserRepository,
    UserProfileRepository,
    UserProfileRepository,
    TeacherRepository,
    StudentRepository,
  ],
  exports: [UserService],
})
export class UserModule {}
