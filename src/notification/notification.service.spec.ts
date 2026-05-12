vi.mock('./notification.gateway', () => ({
  NotificationGateway: class {
    sendNotificationToClassroom = vi.fn();
    sendNotificationToOrganization = vi.fn();
  },
}));

vi.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-id',
  nanoid: () => 'mock-id',
}));

import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ClassroomService } from 'src/classroom/services/classroom.service';
import { ConfigModule } from 'src/config/config.module';
import { MailService } from 'src/mail/mail.service';
import { NotificationType } from './notification.constants';
import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let eventEmitter: EventEmitter2;
  let repository: NotificationRepository;
  let mailService: MailService;

  const mockNotificationRepository = { create: vi.fn() };
  const mockClassroomService = { findUserClassroomIds: vi.fn() };

  const mockMailService = {
    sendTemplate: vi.fn().mockReturnValue(Promise.resolve()),
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
          useValue: {
            sendNotificationToClassroom: vi.fn(),
            sendNotificationToOrganization: vi.fn(),
          },
        },
        { provide: MailService, useValue: mockMailService },
        { provide: ClassroomService, useValue: mockClassroomService },
      ],
    }).compile();

    await module.init();
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    repository = module.get<NotificationRepository>(NotificationRepository);
    mailService = module.get<MailService>(MailService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger the repository and send an email when event is emitted', async () => {
    const testPayload = {
      title: 'Real Event Test',
      content: 'Email check content',
      organizationId: 'org-123',
      entityId: 'classroom-123',
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
      entityId: 'classroom-123',
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
