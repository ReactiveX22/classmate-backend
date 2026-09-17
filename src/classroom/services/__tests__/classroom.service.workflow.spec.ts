import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { CourseRepository } from 'src/course/repositories/course.repository';
import { StorageService } from 'src/storage/storage.service';
import { ClassroomRepository } from '../../classroom.repository';
import { ClassroomPostRepository } from '../../repositories/classroom-post.repository';
import { ClassroomService } from '../classroom.service';
import {
  ApplicationNotFoundException,
  ApplicationForbiddenException,
} from 'src/common/exceptions/application.exception';

describe('ClassroomService - Create workflow', () => {
  let service: ClassroomService;

  const mockCourseRepository = {
    findById: vi.fn(),
  };

  const mockClassroomRepository = {
    findById: vi.fn(),
    create: vi.fn(),
    findByClassCode: vi.fn(),
    isMember: vi.fn(),
    addMembers: vi.fn(),
  };

  const mockStorageService = {
    deleteDirectory: vi.fn(),
  };

  const mockClassroomPostRepository = {};

  beforeEach(async () => {
    vi.clearAllMocks();

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

    service = module.get(ClassroomService);
  });

  describe('create', () => {
    it('creates a classroom with a generated class code', async () => {
      mockCourseRepository.findById.mockResolvedValue({
        id: 'course-1',
        organizationId: 'org-1',
      });
      mockClassroomRepository.create.mockResolvedValue([
        { id: 'class-1', classCode: 'abc1234' },
      ]);

      const result = await service.create(
        {
          courseId: 'course-1',
          name: 'Data Structures',
          section: 'A',
          description: 'CS course',
        },
        'teacher-1',
        'org-1',
      );

      expect(mockClassroomRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-1',
          teacherId: 'teacher-1',
          name: 'Data Structures',
          section: 'A',
        }),
      );
      expect(result).toBeDefined();
    });

    it('throws when course is not found', async () => {
      mockCourseRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(
          {
            courseId: 'nonexistent',
            name: 'Test',
            section: '',
            description: '',
          },
          'teacher-1',
          'org-1',
        ),
      ).rejects.toThrow(ApplicationNotFoundException);
    });

    it('throws when course belongs to another organization', async () => {
      mockCourseRepository.findById.mockResolvedValue({
        id: 'course-1',
        organizationId: 'org-other',
      });

      await expect(
        service.create(
          { courseId: 'course-1', name: 'Test', section: '', description: '' },
          'teacher-1',
          'org-1',
        ),
      ).rejects.toThrow(ApplicationForbiddenException);
    });
  });

  describe('findOne', () => {
    it('returns classroom when found and belongs to org', async () => {
      mockClassroomRepository.findById.mockResolvedValue({
        id: 'class-1',
        course: { organizationId: 'org-1' },
      });

      const result = await service.findOne('class-1', 'org-1');
      expect(result.id).toBe('class-1');
    });

    it('throws when classroom not found', async () => {
      mockClassroomRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-1')).rejects.toThrow(
        ApplicationNotFoundException,
      );
    });

    it('throws when classroom belongs to another org', async () => {
      mockClassroomRepository.findById.mockResolvedValue({
        id: 'class-1',
        course: { organizationId: 'org-other' },
      });

      await expect(service.findOne('class-1', 'org-1')).rejects.toThrow(
        ApplicationNotFoundException,
      );
    });
  });
});

describe('ClassroomService - Join workflow', () => {
  let service: ClassroomService;

  const mockCourseRepository = {};
  const mockClassroomRepository = {
    findById: vi.fn(),
    findByClassCode: vi.fn(),
    isMember: vi.fn(),
    addMembers: vi.fn(),
  };
  const mockStorageService = {};
  const mockClassroomPostRepository = {};

  beforeEach(async () => {
    vi.clearAllMocks();

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

    service = module.get(ClassroomService);
  });

  const classroomWithCode = {
    id: 'class-1',
    course: { organizationId: 'org-1' },
    teacherId: 'teacher-1',
    status: 'active',
    teacher: { name: 'Mrs. Johnson' },
  };

  it('adds student as new member', async () => {
    mockClassroomRepository.findByClassCode.mockResolvedValue(
      classroomWithCode,
    );
    mockClassroomRepository.isMember.mockResolvedValue(false);
    mockClassroomRepository.addMembers.mockResolvedValue([]);

    const result = await service.joinClassroom(
      { classCode: 'abc1234' },
      'student-1',
      'org-1',
    );

    expect(result).toEqual({
      classroomId: 'class-1',
      alreadyMember: false,
    });
    expect(mockClassroomRepository.addMembers).toHaveBeenCalledWith('class-1', [
      'student-1',
    ]);
  });

  it('returns alreadyMember for existing student', async () => {
    mockClassroomRepository.findByClassCode.mockResolvedValue(
      classroomWithCode,
    );
    mockClassroomRepository.isMember.mockResolvedValue(true);

    const result = await service.joinClassroom(
      { classCode: 'abc1234' },
      'student-1',
      'org-1',
    );

    expect(result).toEqual({
      classroomId: 'class-1',
      alreadyMember: true,
    });
    expect(mockClassroomRepository.addMembers).not.toHaveBeenCalled();
  });

  it('throws for invalid class code', async () => {
    mockClassroomRepository.findByClassCode.mockResolvedValue(null);

    await expect(
      service.joinClassroom({ classCode: 'wrong' }, 'student-1', 'org-1'),
    ).rejects.toThrow('Classroom not found');
  });

  it('throws for wrong organization', async () => {
    mockClassroomRepository.findByClassCode.mockResolvedValue({
      ...classroomWithCode,
      course: { organizationId: 'org-other' },
    });

    await expect(
      service.joinClassroom({ classCode: 'abc1234' }, 'student-1', 'org-1'),
    ).rejects.toThrow('You are not authorized to join this classroom');
  });

  it('throws for inactive classroom', async () => {
    mockClassroomRepository.findByClassCode.mockResolvedValue({
      ...classroomWithCode,
      status: 'inactive',
    });

    await expect(
      service.joinClassroom({ classCode: 'abc1234' }, 'student-1', 'org-1'),
    ).rejects.toThrow('This class is no longer active');
    expect(mockClassroomRepository.addMembers).not.toHaveBeenCalled();
  });

  it('teacher joining own classroom returns alreadyMember', async () => {
    mockClassroomRepository.findByClassCode.mockResolvedValue(
      classroomWithCode,
    );
    mockClassroomRepository.isMember.mockResolvedValue(false);

    const result = await service.joinClassroom(
      { classCode: 'abc1234' },
      'teacher-1',
      'org-1',
    );

    expect(result).toEqual({
      classroomId: 'class-1',
      alreadyMember: true,
    });
    expect(mockClassroomRepository.addMembers).not.toHaveBeenCalled();
  });
});
