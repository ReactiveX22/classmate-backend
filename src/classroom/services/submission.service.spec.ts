import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import { ApplicationBadRequestException } from 'src/common/exceptions/application.exception';
import { StorageService } from 'src/storage/storage.service';
import { SubmissionRepository } from '../repositories/submission.repository';
import { ClassroomService } from './classroom.service';
import { SubmissionService } from './submission.service';

const mockPost = (overrides: Record<string, unknown> = {}) => ({
  id: 'post-123',
  type: 'assignment',
  assignmentData: {
    dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    allowLateSubmission: false,
  },
  ...overrides,
});

const mockSubmission = {
  id: 'sub-123',
  postId: 'post-123',
  studentId: 'student-123',
  status: 'turned_in',
};

describe('SubmissionService', () => {
  let service: SubmissionService;
  let submissionRepository: {
    create: ReturnType<typeof vi.fn>;
  };
  let classroomService: {
    findPost: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        SubmissionService,
        {
          provide: SubmissionRepository,
          useValue: { create: vi.fn() },
        },
        {
          provide: ClassroomService,
          useValue: { findPost: vi.fn() },
        },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
    submissionRepository = module.get<{
      create: ReturnType<typeof vi.fn>;
    }>(SubmissionRepository);
    classroomService = module.get<{
      findPost: ReturnType<typeof vi.fn>;
    }>(ClassroomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submit', () => {
    it('accepts an on-time submission', async () => {
      classroomService.findPost.mockResolvedValue(mockPost());
      submissionRepository.create.mockResolvedValue(mockSubmission);

      const result = await service.submit(
        'classroom-123',
        'post-123',
        'student-123',
        'org-123',
        { content: 'My answer' },
      );

      expect(submissionRepository.create).toHaveBeenCalledWith({
        postId: 'post-123',
        studentId: 'student-123',
        content: 'My answer',
        attachments: undefined,
        status: 'turned_in',
      });
      expect(result).toEqual(mockSubmission);
    });

    it('rejects a late submission when late submissions are not allowed', async () => {
      classroomService.findPost.mockResolvedValue(
        mockPost({
          assignmentData: {
            dueDate: new Date(Date.now() - 86_400_000).toISOString(),
            allowLateSubmission: false,
          },
        }),
      );

      await expect(
        service.submit('classroom-123', 'post-123', 'student-123', 'org-123', {
          content: 'Too late',
        }),
      ).rejects.toThrow(
        new ApplicationBadRequestException(
          'This assignment is past its due date and does not allow late submissions',
          ERROR_CODES.CLASSROOM.SUBMISSION_PAST_DUE,
        ),
      );

      expect(submissionRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a late submission when allowLateSubmission is undefined', async () => {
      classroomService.findPost.mockResolvedValue(
        mockPost({
          assignmentData: {
            dueDate: new Date(Date.now() - 86_400_000).toISOString(),
          },
        }),
      );

      await expect(
        service.submit('classroom-123', 'post-123', 'student-123', 'org-123', {
          content: 'Too late',
        }),
      ).rejects.toThrow(ApplicationBadRequestException);

      expect(submissionRepository.create).not.toHaveBeenCalled();
    });

    it('accepts a late submission and flags it as late when allowed', async () => {
      classroomService.findPost.mockResolvedValue(
        mockPost({
          assignmentData: {
            dueDate: new Date(Date.now() - 86_400_000).toISOString(),
            allowLateSubmission: true,
          },
        }),
      );
      submissionRepository.create.mockResolvedValue(mockSubmission);

      const result = await service.submit(
        'classroom-123',
        'post-123',
        'student-123',
        'org-123',
        { content: 'Late but allowed' },
      );

      expect(result).toEqual({ ...mockSubmission, isLate: true });
    });

    it('accepts a submission with no due date', async () => {
      classroomService.findPost.mockResolvedValue(
        mockPost({
          assignmentData: { allowLateSubmission: false },
        }),
      );
      submissionRepository.create.mockResolvedValue(mockSubmission);

      const result = await service.submit(
        'classroom-123',
        'post-123',
        'student-123',
        'org-123',
        { content: 'No deadline' },
      );

      expect(result).toEqual(mockSubmission);
    });

    it('does not enforce deadlines on non-assignment posts', async () => {
      classroomService.findPost.mockResolvedValue(
        mockPost({
          type: 'announcement',
          assignmentData: {
            dueDate: new Date(Date.now() - 86_400_000).toISOString(),
            allowLateSubmission: false,
          },
        }),
      );
      submissionRepository.create.mockResolvedValue(mockSubmission);

      const result = await service.submit(
        'classroom-123',
        'post-123',
        'student-123',
        'org-123',
        { content: 'Not an assignment' },
      );

      expect(result).toEqual(mockSubmission);
    });
  });
});
