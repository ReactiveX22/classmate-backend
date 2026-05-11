import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from 'src/storage/storage.service';
import { NoticeRepository } from './notice.repository';
import { NoticeService } from './notice.service';

describe('NoticeService', () => {
  let service: NoticeService;

  const mockNoticeRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockStorageService = {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        NoticeService,
        {
          provide: NoticeRepository,
          useValue: mockNoticeRepository,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<NoticeService>(NoticeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
