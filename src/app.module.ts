import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { DatabaseModule } from './database/database.module';
import { TestItemsModule } from './test-items/test-items.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [DatabaseModule, AuthModule, UserModule, CourseModule],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
