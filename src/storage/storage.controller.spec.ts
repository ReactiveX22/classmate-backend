vi.mock('src/classroom/guard/classroom-member.guard', () => ({
  ClassroomMemberGuard: class {
    canActivate = vi.fn().mockResolvedValue(true);
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { STORAGE_STRATEGY } from './interfaces/storage-strategy.interface';
import { StorageController } from './storage.controller';

describe('StorageController', () => {
  let controller: StorageController;

  const mockStorageStrategy = {
    serveFile: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: STORAGE_STRATEGY, useValue: mockStorageStrategy }],
    }).compile();

    controller = module.get<StorageController>(StorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
