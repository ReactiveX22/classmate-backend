import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { NoticeService } from '../notice.service';
import { NoticeRepository } from '../notice.repository';
import { StorageService } from 'src/storage/storage.service';
import {
  ApplicationNotFoundException,
  ApplicationForbiddenException,
} from 'src/common/exceptions/application.exception';

describe('NoticeService - Create and Retrieve workflow', () => {
  let service: NoticeService;
  let noticeRepository: any;
  let eventEmitter: EventEmitter2;

  const mockUser = {
    id: 'admin-1',
    name: 'Admin User',
    image: null,
    organizationId: 'org-1',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    noticeRepository = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        NoticeService,
        { provide: NoticeRepository, useValue: noticeRepository },
        { provide: StorageService, useValue: { deleteFile: vi.fn() } },
      ],
    }).compile();

    service = module.get(NoticeService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a notice and emits notification event', async () => {
      const emitSpy = vi.spyOn(eventEmitter, 'emit');
      const mockNotice = {
        id: 'notice-1',
        title: 'Exam Schedule',
        content: 'Final exams start next week',
        organizationId: 'org-1',
        authorId: 'admin-1',
      };
      noticeRepository.create.mockResolvedValue(mockNotice);

      const result = await service.create(
        {
          title: 'Exam Schedule',
          content: 'Final exams start next week',
          tags: [],
          attachments: [],
        },
        mockUser as any,
      );

      expect(result.id).toBe('notice-1');
      expect(result.title).toBe('Exam Schedule');
      expect(noticeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          title: 'Exam Schedule',
          authorId: 'admin-1',
        }),
      );
      expect(emitSpy).toHaveBeenCalled();
    });

    it('throws when user has no organization', async () => {
      await expect(
        service.create(
          { title: 'Test', content: 'Content', tags: [], attachments: [] },
          { ...mockUser, organizationId: undefined } as any,
        ),
      ).rejects.toThrow(ApplicationForbiddenException);
    });
  });

  describe('findAll', () => {
    it('returns paginated notices for the organization', async () => {
      const mockResult = {
        data: [
          { id: 'notice-1', title: 'Notice 1' },
          { id: 'notice-2', title: 'Notice 2' },
        ],
        meta: { total: 2, page: 1, limit: 10 },
      };
      noticeRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll({ page: 1, limit: 10 }, 'org-1');

      expect(result.data).toHaveLength(2);
      expect(noticeRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        'org-1',
      );
    });
  });

  describe('findOne', () => {
    it('returns a notice by id', async () => {
      noticeRepository.findById.mockResolvedValue({
        id: 'notice-1',
        title: 'Important Notice',
      });

      const result = await service.findOne('notice-1', 'org-1');
      expect(result.id).toBe('notice-1');
    });

    it('throws when notice not found', async () => {
      noticeRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-1')).rejects.toThrow(
        ApplicationNotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates a notice', async () => {
      noticeRepository.update.mockResolvedValue({
        id: 'notice-1',
        title: 'Updated Title',
      });

      const result = await service.update(
        'notice-1',
        { title: 'Updated Title' },
        mockUser as any,
      );

      expect(result.title).toBe('Updated Title');
    });

    it('throws when notice not found on update', async () => {
      noticeRepository.update.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { title: 'X' }, mockUser as any),
      ).rejects.toThrow(ApplicationNotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a notice and emits event', async () => {
      const emitSpy = vi.spyOn(eventEmitter, 'emit');
      noticeRepository.findById.mockResolvedValue({ id: 'notice-1' });
      noticeRepository.delete.mockResolvedValue({ id: 'notice-1' });

      const result = await service.delete('notice-1', mockUser as any);

      expect(result).toBeDefined();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('throws when notice not found on delete', async () => {
      noticeRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent', mockUser as any),
      ).rejects.toThrow(ApplicationNotFoundException);
    });

    it('throws when user has no organization on delete', async () => {
      await expect(
        service.delete('notice-1', {
          ...mockUser,
          organizationId: undefined,
        } as any),
      ).rejects.toThrow(ApplicationForbiddenException);
    });
  });
});
