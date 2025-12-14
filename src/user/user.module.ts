import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { TeacherRepository } from './repositories/teacher.repository';
import { StudentRepository } from './repositories/student.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    UserService,
    UserRepository,
    UserProfileRepository,
    UserProfileRepository,
    TeacherRepository,
    StudentRepository,
  ],
  exports: [UserService],
})
export class UserModule {}
