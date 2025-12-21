import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { OrganizationModule } from './organization/organization.module';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UserModule,
    CourseModule,
    OrganizationModule,
    EnrollmentModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
