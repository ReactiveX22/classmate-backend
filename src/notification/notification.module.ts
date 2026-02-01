import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ClassroomModule } from 'src/classroom/classroom.module';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/mail/mail.module';
import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationPaginationConfig } from './notification.config';
import { PaginationModule } from 'src/lib/pagination/pagination.module';

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    AuthModule,
    ClassroomModule,
    PaginationModule,
  ],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationGateway,
    NotificationPaginationConfig,
  ],
  controllers: [NotificationController],
})
export class NotificationModule {}
