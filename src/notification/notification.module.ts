import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { MailModule } from 'src/mail/mail.module';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

@Module({
  imports: [DatabaseModule, MailModule],
  providers: [NotificationService, NotificationRepository],
})
export class NotificationModule {}
