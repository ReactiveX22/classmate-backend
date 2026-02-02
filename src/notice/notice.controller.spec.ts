jest.mock('@thallesp/nestjs-better-auth', () => ({
  Roles: () => jest.fn(),
  Session: () => jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppUserSession } from 'src/common/types/session.types';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';

describe('NoticeController', () => {
  let controller: NoticeController;
  let service: NoticeService;

  const mockNoticeService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    uploadAttachment: jest.fn(),
    deleteAttachment: jest.fn(),
  };

  const mockSession: AppUserSession = {
    user: {
      id: 'user-id',
      role: 'admin',
      organizationId: 'org-id',
      email: 'test@example.com',
    } as any,
    session: {
      id: 'session-id',
    } as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NoticeController],
      providers: [
        {
          provide: NoticeService,
          useValue: mockNoticeService,
        },
      ],
    }).compile();

    controller = module.get<NoticeController>(NoticeController);
    service = module.get<NoticeService>(NoticeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated notices', async () => {
      const query: PaginationQueryDto = { page: 1, limit: 10 };
      const orgId = 'org-id';
      const expectedResult = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      mockNoticeService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query, orgId);

      expect(service.findAll).toHaveBeenCalledWith(query, orgId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createNotice', () => {
    it('should create a notice', async () => {
      const dto: CreateNoticeDto = {
        title: 'Test Notice',
        content: 'Content',
        tags: [],
        attachments: [],
      };
      const expectedResult = { id: 'notice-id', ...dto };

      mockNoticeService.create.mockResolvedValue(expectedResult);

      const result = await controller.createNotice(dto, mockSession);

      expect(service.create).toHaveBeenCalledWith(dto, mockSession.user);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateNotice', () => {
    it('should update a notice', async () => {
      const id = 'notice-id';
      const dto: UpdateNoticeDto = { title: 'Updated Title' };
      const expectedResult = { id, ...dto };

      mockNoticeService.update.mockResolvedValue(expectedResult);

      const result = await controller.updateNotice(id, dto, mockSession);

      expect(service.update).toHaveBeenCalledWith(id, dto, mockSession.user);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteNotice', () => {
    it('should delete a notice', async () => {
      const id = 'notice-id';

      mockNoticeService.delete.mockResolvedValue(true);

      await controller.deleteNotice(id, mockSession);

      expect(service.delete).toHaveBeenCalledWith(id, mockSession.user);
    });
  });

  describe('uploadFile', () => {
    it('should upload a file', async () => {
      const file = { originalname: 'test.jpg' } as any;
      const orgId = 'org-id';
      const expectedResult = { id: 'file-id', url: 'http://test.com/file' };

      mockNoticeService.uploadAttachment.mockResolvedValue(expectedResult);

      const result = await controller.uploadFile(file, orgId);

      expect(service.uploadAttachment).toHaveBeenCalledWith(file, orgId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      const attachmentId = 'att-id';
      const orgId = 'org-id';

      mockNoticeService.deleteAttachment.mockResolvedValue(undefined);

      await controller.deleteFile(attachmentId, orgId);

      expect(service.deleteAttachment).toHaveBeenCalledWith(
        orgId,
        attachmentId,
      );
    });
  });
});
