import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ClassroomModule } from 'src/classroom/classroom.module';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/mail/mail.module';
import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

@Module({
  imports: [DatabaseModule, MailModule, AuthModule, ClassroomModule],
  providers: [NotificationService, NotificationRepository, NotificationGateway],
})
export class NotificationModule {}
