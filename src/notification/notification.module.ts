import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [NotificationService, NotificationRepository],
})
export class NotificationModule {}
