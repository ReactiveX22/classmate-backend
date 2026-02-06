import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORTER } from './interfaces/mail-transporter.interface';
import { MailEventListener } from './listeners/mail-event.listener';
import { MailService } from './mail.service';
import { GmailStrategy } from './strategies/gmail.strategy';
import { MailtrapStrategy } from './strategies/mailtrap.strategy';
import { NullMailStrategy } from './strategies/null-mail.strategy';

@Module({
  providers: [
    MailService,
    MailEventListener,
    {
      provide: MAIL_TRANSPORTER,
      useFactory: (configService: ConfigService) => {
        const service = configService.get<string>('MAIL_SERVICE', 'null');
        const user = configService.get<string>('MAIL_USER') || '';
        const pass = configService.get<string>('MAIL_PASS') || '';
        const from = configService.get<string>(
          'MAIL_FROM',
          'noreply@classmate.com',
        );

        switch (service.toLowerCase()) {
          case 'google':
          case 'gmail':
            return new GmailStrategy(user, pass, from);
          case 'mailtrap':
            return new MailtrapStrategy(user, pass, from);
          case 'null':
          default:
            return new NullMailStrategy();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
