import { Module } from '@nestjs/common';
import { CourseModule } from 'src/course/course.module';
import { UserModule } from 'src/user/user.module';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [UserModule, CourseModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
