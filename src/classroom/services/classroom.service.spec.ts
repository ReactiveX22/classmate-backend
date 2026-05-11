import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { EMBEDDING_EVENTS } from 'src/embedding/embedding.constants';
import { CourseRepository } from 'src/course/repositories/course.repository';
import { StorageService } from 'src/storage/storage.service';
import { AttachmentType } from 'src/common/dto/attachment.dto';
import { ClassroomRepository } from '../classroom.repository';
import { PostType } from '../dto/create-classroom-post.dto';
import { ClassroomPostRepository } from '../repositories/classroom-post.repository';
import { ClassroomService } from './classroom.service';

describe('ClassroomService', () => {
  let service: ClassroomService;
  let eventEmitter: EventEmitter2;

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
    deleteFiles: vi.fn(),
  };

  const mockClassroomPostRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deletePost: vi.fn(),
    deleteAttachment: vi.fn(),
    fetchOne: vi.fn(),
    runInTransaction: vi.fn((cb) => cb({})),
    findUsersByIds: vi.fn().mockResolvedValue([]),
  };

  const mockClassroom = {
    id: 'classroom-123',
    course: { organizationId: 'org-123' },
    teacherId: 'teacher-123',
  };

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    image: null,
  };

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

    service = module.get<ClassroomService>(ClassroomService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('embedding events', () => {
    it('should emit CLASSROOM_POST_ATTACHMENTS_CHANGED when creating post with attachments', async () => {
      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      mockClassroomRepository.findById.mockResolvedValue(mockClassroom);
      mockClassroomPostRepository.create.mockResolvedValue({
        id: 'post-123',
        title: 'Test Post',
        type: PostType.ANNOUNCEMENT,
        attachments: [{ id: 'attachment-1' }, { id: 'attachment-2' }],
      });

      await service.createPost(
        'classroom-123',
        mockUser as any,
        {
          title: 'Test Post',
          content: 'Test content',
          type: PostType.ANNOUNCEMENT,
          attachments: [],
        },
        'org-123',
      );

      expect(emitSpy).toHaveBeenCalledWith(
        EMBEDDING_EVENTS.CLASSROOM_POST_ATTACHMENTS_CHANGED,
        expect.objectContaining({
          organizationId: 'org-123',
          classroomId: 'classroom-123',
          postId: 'post-123',
          attachmentIds: ['attachment-1', 'attachment-2'],
          userId: 'user-123',
        }),
      );
    });

    it('should NOT emit CLASSROOM_POST_ATTACHMENTS_CHANGED when creating post without attachments', async () => {
      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      mockClassroomRepository.findById.mockResolvedValue(mockClassroom);
      mockClassroomPostRepository.create.mockResolvedValue({
        id: 'post-123',
        title: 'Test Post',
        type: PostType.ANNOUNCEMENT,
        attachments: [],
      });

      await service.createPost(
        'classroom-123',
        mockUser as any,
        {
          title: 'Test Post',
          content: 'Test content',
          type: PostType.ANNOUNCEMENT,
        },
        'org-123',
      );

      expect(emitSpy).not.toHaveBeenCalledWith(
        EMBEDDING_EVENTS.CLASSROOM_POST_ATTACHMENTS_CHANGED,
        expect.anything(),
      );
    });

    it('should emit CLASSROOM_POST_ATTACHMENTS_CHANGED when updating post with new attachments', async () => {
      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      mockClassroomRepository.findById.mockResolvedValue(mockClassroom);
      mockClassroomPostRepository.fetchOne.mockResolvedValue({
        id: 'post-123',
        classroomId: 'classroom-123',
        attachments: [{ id: 'existing-attachment' }],
      });
      mockClassroomPostRepository.update.mockResolvedValue({
        id: 'post-123',
        attachments: [{ id: 'existing-attachment' }, { id: 'new-attachment' }],
      });

      await service.updatePost(
        'classroom-123',
        'post-123',
        'author-123',
        {
          title: 'Updated Post',
          attachments: [
            {
              id: 'new-attachment',
              name: 'new-attachment.pdf',
              url: 'attachments/new-attachment.pdf',
              type: AttachmentType.FILE,
            },
          ],
        },
        'org-123',
      );

      expect(emitSpy).toHaveBeenCalledWith(
        EMBEDDING_EVENTS.CLASSROOM_POST_ATTACHMENTS_CHANGED,
        expect.objectContaining({
          organizationId: 'org-123',
          classroomId: 'classroom-123',
          postId: 'post-123',
          attachmentIds: ['new-attachment'],
          userId: 'author-123',
        }),
      );
    });

    it('should emit CLASSROOM_ATTACHMENT_DELETED when deleting an attachment', async () => {
      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      mockClassroomRepository.findById.mockResolvedValue(mockClassroom);
      mockClassroomPostRepository.deleteAttachment.mockResolvedValue({
        post: { id: 'post-123' },
      });
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      await service.deleteAttachment(
        'classroom-123',
        'org-123',
        'attachment-123',
      );

      expect(emitSpy).toHaveBeenCalledWith(
        EMBEDDING_EVENTS.CLASSROOM_ATTACHMENT_DELETED,
        expect.objectContaining({
          organizationId: 'org-123',
          classroomId: 'classroom-123',
          postId: 'post-123',
          attachmentId: 'attachment-123',
        }),
      );
    });

    it('should emit CLASSROOM_POST_DELETED when deleting a post', async () => {
      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      mockClassroomRepository.findById.mockResolvedValue(mockClassroom);
      mockClassroomPostRepository.fetchOne.mockResolvedValue({
        id: 'post-123',
        classroomId: 'classroom-123',
        attachments: [{ id: 'attachment-1', type: 'file' }],
      });
      mockStorageService.deleteFiles.mockResolvedValue(undefined);
      mockClassroomPostRepository.deletePost.mockResolvedValue(undefined);

      await service.deletePost('classroom-123', 'org-123', 'post-123');

      expect(emitSpy).toHaveBeenCalledWith(
        EMBEDDING_EVENTS.CLASSROOM_POST_DELETED,
        expect.objectContaining({
          organizationId: 'org-123',
          classroomId: 'classroom-123',
          postId: 'post-123',
        }),
      );
    });
  });
});
