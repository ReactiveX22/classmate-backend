import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClassroomModule } from './classroom/classroom.module';
import { CourseModule } from './course/course.module';
import { DatabaseModule } from './database/database.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { NotificationModule } from './notification/notification.module';
import { OrganizationModule } from './organization/organization.module';
import { StorageModule } from './storage/storage.module';
import { UserModule } from './user/user.module';
import { NoticeModule } from './notice/notice.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UserModule,
    CourseModule,
    OrganizationModule,
    EnrollmentModule,
    ClassroomModule,
    StorageModule,
    NotificationModule,
    NoticeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
