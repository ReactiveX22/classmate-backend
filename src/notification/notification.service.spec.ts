import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { MailModule } from 'src/mail/mail.module';
import { MailService } from 'src/mail/mail.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let eventEmitter: EventEmitter2;
  let repository: NotificationRepository;

  const mockNotificationRepository = {
    create: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), MailModule],
      providers: [
        NotificationService,
        {
          provide: NotificationRepository,
          useValue: mockNotificationRepository,
        },
        MailService,
      ],
    }).compile();

    await module.init();

    service = module.get<NotificationService>(NotificationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    repository = module.get<NotificationRepository>(NotificationRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should trigger the repository when the "notification.created" event is emitted', async () => {
    const testPayload = {
      title: 'Real Event Test',
      content: 'Event is real, DB is fake',
      organizationId: 'any-string-works-here',
      type: 'INFO',
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
    };

    mockNotificationRepository.create.mockResolvedValue({
      id: '123',
      ...testPayload,
    });

    await eventEmitter.emitAsync('notification.created', testPayload);

    expect(repository.create).toHaveBeenCalledWith(testPayload);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
});
