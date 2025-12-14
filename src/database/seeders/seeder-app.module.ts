import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { CourseModule } from 'src/course/course.module';
import { DatabaseModule } from 'src/database/database.module';
import { UserModule } from 'src/user/user.module';
import { AdminSeeder } from './admin.seeder';
import { CourseSeeder } from './course.seeder';
import { StudentSeeder } from './student.seeder';
import { TeacherSeeder } from './teacher.seeder';

/**
 * Standalone module for database seeding.
 * This module is only used during seeding operations and should NOT be imported in AppModule.
 * It imports only the necessary modules for seeding operations.
 */
@Module({
  imports: [DatabaseModule, AuthModule, UserModule, CourseModule],
  providers: [AdminSeeder, TeacherSeeder, StudentSeeder, CourseSeeder],
  exports: [AdminSeeder, TeacherSeeder, StudentSeeder, CourseSeeder],
})
export class SeederAppModule {}
