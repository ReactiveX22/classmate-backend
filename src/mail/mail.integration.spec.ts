import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EnvironmentVariables } from 'src/config/env.validation';
import { ConfigModule } from '../config/config.module';
import { MailModule } from './mail.module';
import { MailService } from './mail.service';

describe('MailService Integration', () => {
  let service: MailService;
  let configService: ConfigService<EnvironmentVariables, true>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, MailModule],
    }).compile();

    service = module.get<MailService>(MailService);
    configService =
      module.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  });

  it('should send a real email via Mailtrap if configured', async () => {
    const isConfigured =
      configService.get('MAIL_SERVICE') === 'mailtrap' &&
      !!configService.get('MAIL_USER') &&
      !!configService.get('MAIL_PASS');

    if (!isConfigured) {
      console.warn(
        'Integration test for Mailtrap skipped: MAIL_SERVICE is not set to "mailtrap"',
      );
      return;
    }

    await expect(
      service.sendTemplate(
        'test-receiver@example.com',
        'Integration Test - MailService',
        'welcome',
        { name: 'Developer', url: 'http://localhost:3000' },
      ),
    ).resolves.not.toThrow();
  });

  it('should send a real email via Google if configured', async () => {
    const isConfigured =
      configService.get('MAIL_SERVICE') === 'google' &&
      !!configService.get('MAIL_USER') &&
      !!configService.get('MAIL_PASS');

    if (!isConfigured) {
      console.warn(
        'Integration test for Mailtrap skipped: MAIL_SERVICE is not set to "google"',
      );
      return;
    }
    const testRecipient = configService.get('MAIL_USER');

    await expect(
      service.sendTemplate(
        testRecipient,
        'Integration Test - MailService',
        'welcome',
        { name: 'Developer', url: 'http://localhost:3000' },
      ),
    ).resolves.not.toThrow();
  });
});
