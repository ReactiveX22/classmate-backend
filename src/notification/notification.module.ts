import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/mail/mail.module';
import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [DatabaseModule, MailModule, AuthModule],
  providers: [NotificationService, NotificationRepository, NotificationGateway],
})
export class NotificationModule {}
