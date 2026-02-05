jest.mock('./notification.gateway', () => ({
  NotificationGateway: class {
    sendNotificationToClassroom = jest.fn();
    sendNotificationToOrganization = jest.fn();
  },
}));

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-id',
  nanoid: () => 'mock-id',
}));

import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ClassroomService } from 'src/classroom/services/classroom.service';
import { ConfigModule } from 'src/config/config.module';
import { MailService } from 'src/mail/mail.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { NotificationType } from './notification.constants';

describe('NotificationService', () => {
  let service: NotificationService;
  let eventEmitter: EventEmitter2;
  let repository: NotificationRepository;
  let mailService: MailService;

  const mockNotificationRepository = { create: jest.fn() };
  const mockClassroomService = { findUserClassroomIds: jest.fn() };

  const mockMailService = {
    sendTemplate: jest.fn().mockReturnValue(Promise.resolve()),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, EventEmitterModule.forRoot()],
      providers: [
        NotificationService,
        {
          provide: NotificationRepository,
          useValue: mockNotificationRepository,
        },
        {
          provide: NotificationGateway,
          useClass: jest.requireMock('./notification.gateway')
            .NotificationGateway,
        },
        { provide: MailService, useValue: mockMailService },
        { provide: ClassroomService, useValue: mockClassroomService },
      ],
    }).compile();

    await module.init();
    service = module.get<NotificationService>(NotificationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    repository = module.get<NotificationRepository>(NotificationRepository);
    mailService = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger the repository and send an email when event is emitted', async () => {
    const testPayload = {
      title: 'Real Event Test',
      content: 'Email check content',
      organizationId: 'org-123',
      type: NotificationType.CLASSROOM.ASSIGNMENT,
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
    };

    mockNotificationRepository.create.mockResolvedValue({
      id: '123',
      ...testPayload,
    });

    await eventEmitter.emitAsync('notification.created', {
      payload: testPayload,
    });

    expect(repository.create).toHaveBeenCalledWith(testPayload);

    expect(mailService.sendTemplate).toHaveBeenCalledWith(
      testPayload.recipientEmail,
      testPayload.title,
      'notification',
      expect.objectContaining({
        recipientName: testPayload.recipientName,
        subject: testPayload.title,
        content: testPayload.content,
      }),
    );
    expect(mailService.sendTemplate).toHaveBeenCalledTimes(1);
  });

  it('should not send an email when notification type is not eligible', async () => {
    const testPayload = {
      title: 'Ineligible event',
      content: 'Email check content',
      organizationId: 'org-123',
      type: NotificationType.CLASSROOM.POST,
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
    };

    mockNotificationRepository.create.mockResolvedValue({
      id: '124',
      ...testPayload,
    });

    await eventEmitter.emitAsync('notification.created', {
      payload: testPayload,
    });

    expect(repository.create).toHaveBeenCalledWith(testPayload);
    expect(mailService.sendTemplate).not.toHaveBeenCalled();
  });
});
