import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { CourseRepository } from 'src/course/repositories/course.repository';
import { StorageService } from 'src/storage/storage.service';
import { ClassroomRepository } from '../classroom.repository';
import { ClassroomPostRepository } from '../repositories/classroom-post.repository';
import { ClassroomService } from './classroom.service';

describe('ClassroomService', () => {
  let service: ClassroomService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ClassroomService,
        { provide: CourseRepository, useValue: mockCourseRepository },
        { provide: ClassroomRepository, useValue: mockClassroomRepository },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: ClassroomPostRepository,
          useValue: mockClassroomPostRepository,
        },
      ],
    }).compile();

    service = module.get<ClassroomService>(ClassroomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
