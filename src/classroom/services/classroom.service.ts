import { Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { CreateClassroomPostDto } from 'src/classroom/dto/create-classroom-post.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { CourseRepository } from 'src/course/repositories/course.repository';
import { StorageService } from 'src/storage/storage.service';
import { ClassroomRepository } from '../classroom.repository';
import { AddMembersClassroomDto } from '../dto/addMembers-classroom.dto';
import { CreateClassroomDto } from '../dto/create-classroom.dto';
import { JoinClassroomDto } from '../dto/join-classroom.dto';
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
  ) {}

  async findAll(query: PaginationQueryDto, orgId: string, userId: string) {
    return await this.classroomRepository.findAll(query, orgId, userId);
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

  async findPostsByClassroom(
    id: string,
    userId: string,
    orgId: string,
    query: PaginationQueryDto,
  ) {
    const classroom = await this.findOne(id, orgId);
    return await this.classroomRepository.findPostsByClassroom(
      query,
      classroom.id,
      userId,
    );
  }

  async createPost(
    id: string,
    authorId: string,
    body: CreateClassroomPostDto,
    orgId: string,
  ) {
    const classroom = await this.findOne(id, orgId);
    return await this.classroomPostRepository.create(
      body,
      classroom.id,
      authorId,
    );
  }

  async updatePost(
    id: string,
    postId: string,
    authorId: string,
    body: UpdateClassroomPostDto,
    orgId: string,
  ) {
    const classroom = await this.findOne(id, orgId);
    return await this.classroomPostRepository.update(postId, authorId, body);
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

  private generateClassCode(): string {
    const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
    return customAlphabet(alphabet, 7)();
  }
}
