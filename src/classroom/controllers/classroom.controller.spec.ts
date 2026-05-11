import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from 'src/cache/cache.service';
import { CourseRepository } from 'src/course/repositories/course.repository';
import { StorageService } from 'src/storage/storage.service';
import { ClassroomRepository } from '../classroom.repository';
import { ClassroomPostRepository } from '../repositories/classroom-post.repository';
import { ClassroomController } from './classroom.controller';
import { ClassroomService } from '../services/classroom.service';

describe('ClassroomController', () => {
  let controller: ClassroomController;

  const mockCourseRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
  };

  const mockClassroomRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockStorageService = {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  };

  const mockClassroomPostRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockCacheManager = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      controllers: [ClassroomController],
      providers: [
        ClassroomService,
        CacheService,
        { provide: CourseRepository, useValue: mockCourseRepository },
        { provide: ClassroomRepository, useValue: mockClassroomRepository },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: ClassroomPostRepository,
          useValue: mockClassroomPostRepository,
        },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        Reflector,
        EventEmitter2,
      ],
    }).compile();

    controller = module.get<ClassroomController>(ClassroomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
