import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MAIL_TRANSPORTER } from './interfaces/mail-transporter.interface';
import * as ejs from 'ejs';

jest.mock('ejs');

describe('MailService', () => {
  let service: MailService;
  let mockTransporter: any;

  beforeEach(async () => {
    mockTransporter = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MAIL_TRANSPORTER,
          useValue: mockTransporter,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send mail using the injected transporter', async () => {
    await service.sendMail('to@test.com', 'subject', 'body');
    expect(mockTransporter.send).toHaveBeenCalledWith({
      to: 'to@test.com',
      subject: 'subject',
      body: 'body',
      html: undefined,
    });
  });

  it('should render template and send mail', async () => {
    (ejs.renderFile as jest.Mock).mockResolvedValue('<html>rendered</html>');

    await service.sendTemplate('to@test.com', 'Welcome', 'welcome', {
      name: 'John',
    });

    expect(ejs.renderFile).toHaveBeenCalled();
    expect(mockTransporter.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@test.com',
        subject: 'Welcome',
        html: '<html>rendered</html>',
      }),
    );
  });
});
