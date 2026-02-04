jest.mock('@thallesp/nestjs-better-auth', () => ({
  Roles: () => jest.fn(),
  Session: () => jest.fn(),
}));

jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-id',
  nanoid: () => 'mock-id',
}));

jest.mock('src/classroom/services/classroom.service');
jest.mock('./notification.gateway');
jest.mock('./notification.repository');
jest.mock('src/mail/mail.service');

import { Test, TestingModule } from '@nestjs/testing';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppUserSession } from 'src/common/types/session.types';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  const mockNotificationService = {
    findAll: jest.fn(),
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
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
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

      mockNotificationService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query, mockSession, orgId);

      expect(service.findAll).toHaveBeenCalledWith(
        query,
        mockSession.user.id,
        orgId,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
