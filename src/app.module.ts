import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisModule } from './redis/redis.module';
import { ResilientThrottlerStorage } from './redis/resilient-throttler.storage';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AppCacheModule } from './cache/cache.module';
import { ClassroomModule } from './classroom/classroom.module';
import { ConfigModule } from './config/config.module';
import { CourseModule } from './course/course.module';
import { DatabaseModule } from './database/database.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { ImpersonationModule } from './impersonation/impersonation.module';
import { MailModule } from './mail/mail.module';
import { NoticeModule } from './notice/notice.module';
import { NotificationModule } from './notification/notification.module';
import { OrganizationModule } from './organization/organization.module';
import { StorageModule } from './storage/storage.module';
import { UserModule } from './user/user.module';
import { AiModule } from './ai/ai.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { ImportModule } from './import/import.module';
import { TodoModule } from './todo/todo.module';
import { AppThrottlerGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redisClient: Redis | null) => ({
        throttlers: [
          { name: 'short', ttl: 1000, limit: 5 },
          { name: 'medium', ttl: 60000, limit: 100 },
          { name: 'long', ttl: 3600000, limit: 1000 },
        ],
        storage: redisClient
          ? new ResilientThrottlerStorage(redisClient)
          : undefined,
      }),
    }),
    AppCacheModule.register(),
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
    MailModule,
    DashboardModule,
    ImpersonationModule,
    AiModule,
    EmbeddingModule,
    ImportModule,
    TodoModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
