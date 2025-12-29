import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClassroomPostModule } from './classroom-post/classroom-post.module';
import { ClassroomModule } from './classroom/classroom.module';
import { CourseModule } from './course/course.module';
import { DatabaseModule } from './database/database.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { OrganizationModule } from './organization/organization.module';
import { StorageModule } from './storage/storage.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UserModule,
    CourseModule,
    OrganizationModule,
    EnrollmentModule,
    ClassroomModule,
    ClassroomPostModule,
    StorageModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
