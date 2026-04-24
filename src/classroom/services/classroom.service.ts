import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { customAlphabet } from 'nanoid';
import { User } from 'src/auth/auth.factory';
import { CreateClassroomPostDto } from 'src/classroom/dto/create-classroom-post.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { CourseRepository } from 'src/course/repositories/course.repository';
import { NotificationCreatedEvent } from 'src/notification/notification-created.event';
import { NotificationType } from 'src/notification/notification.constants';
import { NotificationTemplate } from 'src/notification/template/notification.template';
import { StorageService } from 'src/storage/storage.service';
import { ClassroomRepository } from '../classroom.repository';
import { AddMembersClassroomDto } from '../dto/addMembers-classroom.dto';
import { CreateClassroomDto } from '../dto/create-classroom.dto';
import { JoinClassroomDto } from '../dto/join-classroom.dto';
import { ListClassroomPostsDto } from '../dto/list-classroom-posts.dto';
import { UpdateClassroomPostDto } from '../dto/update-classroom-post.dto';
import { UpdateClassroomDto } from '../dto/update-classroom.dto';
import { ClassroomPostRepository } from '../repositories/classroom-post.repository';

@Injectable()
export class ClassroomService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly classroomRepository: ClassroomRepository,
    private readonly storageService: StorageService,
    private readonly classroomPostRepository: ClassroomPostRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    query: PaginationQueryDto,
    orgId: string,
    userId: string,
    role: AppRole,
  ) {
    const result = await this.classroomRepository.findAll(query, orgId, userId);

    const dataWithUpcoming = await Promise.all(
      (result.data as any[]).map(async (item) => {
        const upcoming = await this.classroomRepository.findUpcomingPosts(
          item.classroom.id,
          userId,
          role === AppRole.Student,
        );
        return {
          ...item,
          upcoming,
        };
      }),
    );

    return {
      ...result,
      data: dataWithUpcoming,
    };
  }

  async findOne(id: string, orgId: string) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom || classroom.course.organizationId !== orgId) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    return classroom;
  }

  async create(dto: CreateClassroomDto, userId: string, orgId: string) {
    const course = await this.courseRepository.findById(dto.courseId);
    if (!course) {
      throw new ApplicationNotFoundException('Course not found');
    }
    if (course.organizationId !== orgId) {
      throw new ApplicationForbiddenException(
        'Course does not belong to your organization',
      );
    }

    // TODO: check if user is assigned to this course

    const classCode = this.generateClassCode();

    return await this.classroomRepository.create({
      ...dto,
      teacherId: userId,
      classCode,
    });
  }

  async update(
    id: string,
    userId: string,
    orgId: string,
    dto: UpdateClassroomDto,
  ) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    if (
      classroom.teacherId !== userId ||
      classroom.course.organizationId !== orgId
    ) {
      throw new ApplicationForbiddenException(
        'You are not authorized to update this classroom',
      );
    }

    return await this.classroomRepository.update(id, dto);
  }

  async delete(id: string, userId: string, orgId: string) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    if (
      classroom.teacherId !== userId ||
      classroom.course.organizationId !== orgId
    ) {
      throw new ApplicationForbiddenException(
        'You are not authorized to delete this classroom',
      );
    }

    await this.storageService.deleteDirectory(`classroom-attachments/${id}`);
    return await this.classroomRepository.delete(id);
  }

  async addMembers(
    id: string,
    userId: string,
    orgId: string,
    dto: AddMembersClassroomDto,
  ) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    if (
      classroom.teacherId !== userId ||
      classroom.course.organizationId !== orgId
    ) {
      throw new ApplicationForbiddenException(
        'You are not authorized to update this classroom',
      );
    }

    return await this.classroomRepository.addMembers(id, dto.studentIds);
  }

  async removeMembers(
    id: string,
    userId: string,
    orgId: string,
    dto: AddMembersClassroomDto,
  ) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    if (
      classroom.teacherId !== userId ||
      classroom.course.organizationId !== orgId
    ) {
      throw new ApplicationForbiddenException(
        'You are not authorized to update this classroom',
      );
    }

    await this.classroomRepository.removeMembers(id, dto.studentIds);
  }

  async leaveClassroom(id: string, userId: string, orgId: string) {
    const classroom = await this.classroomRepository.findById(id);
    if (!classroom) {
      throw new ApplicationNotFoundException('Classroom not found');
    }
    if (classroom.course.organizationId !== orgId) {
      throw new ApplicationForbiddenException(
        'Classroom does not belong to your organization',
      );
    }

    await this.classroomRepository.leaveClassroom(id, userId);
  }

  async findPostsByClassroom(
    id: string,
    user: User,
    orgId: string,
    query: ListClassroomPostsDto,
  ) {
    const classroom = await this.findOne(id, orgId);
    const normalizedTags = this.normalizeTags(query.tags);
    return await this.classroomRepository.findPostsByClassroom(
      { ...query, tags: normalizedTags },
      classroom.id,
      user.role === AppRole.Instructor,
      classroom.teacherId,
      user.id,
    );
  }

  async createPost(
    id: string,
    user: User,
    body: CreateClassroomPostDto,
    orgId: string,
  ) {
    const classroom = await this.findOne(id, orgId);
    const normalizedBody: CreateClassroomPostDto = {
      ...body,
      tags: this.normalizeTags(body.tags),
    };
    const newPost = await this.classroomPostRepository.runInTransaction(
      async (tx) => {
        const post = await this.classroomPostRepository.create(
          tx,
          normalizedBody,
          classroom.id,
          user.id,
        );

        if (normalizedBody.type === 'assignment') {
          const members =
            await this.classroomPostRepository.getClassroomMembers(
              tx,
              classroom.id,
            );
          await this.classroomPostRepository.createSubmissions(
            tx,
            post.id,
            members.map((m) => m.studentId),
          );
        }

        return post;
      },
    );

    const notificationMapping: Record<
      string,
      { type: string; template: string }
    > = {
      announcement: {
        type: NotificationType.CLASSROOM.ANNOUNCEMENT,
        template: 'CLASSROOM_ANNOUNCEMENT',
      },
      assignment: {
        type: NotificationType.CLASSROOM.ASSIGNMENT,
        template: 'CLASSROOM_ASSIGNMENT',
      },
      material: {
        type: NotificationType.CLASSROOM.MATERIAL,
        template: 'CLASSROOM_MATERIAL',
      },
      question: {
        type: NotificationType.CLASSROOM.QUESTION,
        template: 'CLASSROOM_QUESTION',
      },
    };

    const mapping = notificationMapping[normalizedBody.type] || {
      type: NotificationType.CLASSROOM.POST,
      template: 'CLASSROOM_POST',
    };

    const formatted = NotificationTemplate.format(mapping.template, {
      entityTitle: newPost.title || 'New Classroom Post',
      entityContent: newPost.content ?? undefined,
    });

    this.eventEmitter.emit(
      NotificationCreatedEvent.signature,
      new NotificationCreatedEvent({
        title: formatted.title,
        content: formatted.content,
        type: mapping.type as any,
        organizationId: classroom.course.organizationId,
        recipientId: null,
        actorId: user.id,
        entityId: classroom.id,
        meta: { postId: newPost.id },
        actor: {
          id: user.id,
          name: user.name || '',
          image: user.image || null,
        },
      }),
    );

    return newPost;
  }

  async updatePost(
    id: string,
    postId: string,
    authorId: string,
    body: UpdateClassroomPostDto,
    orgId: string,
  ) {
    const classroom = await this.findOne(id, orgId);
    const normalizedBody: UpdateClassroomPostDto = {
      ...body,
      tags: body.tags ? this.normalizeTags(body.tags) : body.tags,
    };
    return await this.classroomPostRepository.update(
      postId,
      authorId,
      normalizedBody,
    );
  }

  async findPost(id: string, orgId: string, postId: string, userId: string) {
    await this.findOne(id, orgId);
    const post = await this.classroomPostRepository.fetchOne(postId, userId);
    if (!post) throw new ApplicationNotFoundException('Post not found');
    return post;
  }

  async uploadAttachment(file: Express.Multer.File, id: string, orgId: string) {
    const classroom = await this.findOne(id, orgId);

    return await this.storageService.uploadFile(
      file,
      `classroom-attachments/${classroom.id}`,
    );
  }

  async deleteAttachment(id: string, orgId: string, attachmentId: string) {
    const classroom = await this.findOne(id, orgId);

    await this.classroomPostRepository.deleteAttachment(
      classroom.id,
      attachmentId,
    );

    await this.storageService.deleteFile(
      `classroom-attachments/${classroom.id}/${attachmentId}`,
    );
  }

  async deletePost(id: string, orgId: string, postId: string) {
    const classroom = await this.findOne(id, orgId);
    const post = await this.classroomPostRepository.fetchOne(postId);

    if (!post) return;

    const attachmentIds =
      post.attachments?.filter((a) => a.type !== 'link').map((a) => a.id) ?? [];

    if (attachmentIds.length > 0) {
      await this.storageService.deleteFiles(
        `classroom-attachments/${classroom.id}`,
        attachmentIds,
      );
    }

    await this.classroomPostRepository.deletePost(classroom.id, postId);
  }

  async bookmarkPost(
    classroomId: string,
    postId: string,
    userId: string,
    orgId: string,
  ) {
    await this.findOne(classroomId, orgId);
    const post = await this.classroomPostRepository.fetchOne(postId);
    if (!post || post.classroomId !== classroomId) {
      throw new ApplicationNotFoundException('Post not found');
    }
    await this.classroomPostRepository.bookmark(postId, userId);
  }

  async unbookmarkPost(
    classroomId: string,
    postId: string,
    userId: string,
    orgId: string,
  ) {
    await this.findOne(classroomId, orgId);
    const post = await this.classroomPostRepository.fetchOne(postId);
    if (!post || post.classroomId !== classroomId) {
      throw new ApplicationNotFoundException('Post not found');
    }
    await this.classroomPostRepository.unbookmark(postId, userId);
  }

  async joinClassroom(dto: JoinClassroomDto, userId: string, orgId: string) {
    const classroom = await this.classroomRepository.findByClassCode(
      dto.classCode,
    );
    if (!classroom) {
      throw new ApplicationNotFoundException('Classroom not found');
    }

    if (classroom.course.organizationId !== orgId) {
      throw new ApplicationForbiddenException(
        'You are not authorized to join this classroom',
      );
    }

    return await this.classroomRepository.addMembers(classroom.id, [userId]);
  }

  async getStudentGradeStats(classroomId: string, studentId: string) {
    return await this.classroomRepository.fetchStudentGradeStats(
      classroomId,
      studentId,
    );
  }

  async getUpcomingPosts(
    id: string,
    userId: string,
    orgId: string,
    role: AppRole,
  ) {
    await this.findOne(id, orgId);
    return await this.classroomRepository.findUpcomingPosts(
      id,
      userId,
      role === AppRole.Student,
    );
  }

  async findUserClassroomIds(userId: string): Promise<string[]> {
    const classrooms =
      await this.classroomRepository.findJoinedClassrooms(userId);
    return classrooms.map((c) => c.id);
  }

  private generateClassCode(): string {
    const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
    return customAlphabet(alphabet, 7)();
  }

  private normalizeTags(tags?: string[]) {
    if (!tags?.length) return [];

    const uniqueTags = new Set<string>();
    for (const rawTag of tags) {
      const normalized = rawTag.trim().replace(/^#/, '').toLowerCase();
      if (normalized) {
        uniqueTags.add(normalized);
      }
    }

    return Array.from(uniqueTags);
  }
}
