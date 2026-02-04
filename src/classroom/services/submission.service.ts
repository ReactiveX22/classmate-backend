import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from 'src/auth/auth.factory';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { SUBMISSION_STATUS } from 'src/database/schema';
import { NotificationCreatedEvent } from 'src/notification/notification-created.event';
import { NotificationType } from 'src/notification/notification.constants';
import { NotificationTemplate } from 'src/notification/template/notification.template';
import { StorageService } from 'src/storage/storage.service';
import { CreateSubmissionDto } from '../dto/create-assignment-submission.dto';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { SubmissionRepository } from '../repositories/submission.repository';
import { ClassroomService } from './classroom.service';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly classroomService: ClassroomService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async submit(
    classroomId: string,
    postId: string,
    userId: string,
    orgId: string,
    dto: CreateSubmissionDto,
  ) {
    const post = await this.classroomService.findPost(
      classroomId,
      orgId,
      postId,
      userId,
    );

    return await this.submissionRepository.create({
      postId: (post as any).id,
      studentId: userId,
      content: dto.content,
      attachments: dto.attachments,
      status: 'turned_in',
    });
  }

  async fetchAll(postId: string, query: PaginationQueryDto) {
    return await this.submissionRepository.fetchAll(postId, query);
  }

  async fetchOne(userId: string, postId: string) {
    return await this.submissionRepository.fetchOneByUser(userId, postId);
  }

  async unsubmit(postId: string, userId: string) {
    const submission = await this.fetchOne(userId, postId);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== 'turned_in') {
      throw new BadRequestException('Submission is not turned in');
    }

    return await this.submissionRepository.updateStatus(
      userId,
      postId,
      'assigned',
    );
  }

  async deleteAttachment(
    classroomId: string,
    postId: string,
    userId: string,
    attachmentId: string,
  ) {
    const deletedAttachment = await this.submissionRepository.deleteAttachment(
      userId,
      postId,
      attachmentId,
    );

    if (deletedAttachment) {
      await this.storageService.deleteFile(
        `classroom-attachments/${classroomId}/${attachmentId}`,
      );
    }
  }

  async grade(
    classroomId: string,
    postId: string,
    studentId: string,
    teacher: User,
    orgId: string,
    dto: GradeSubmissionDto,
  ) {
    const post = await this.classroomService.findPost(
      classroomId,
      orgId,
      postId,
      studentId,
    );

    const submission = await this.fetchOne(studentId, postId);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status === SUBMISSION_STATUS.ASSIGNED) {
      throw new BadRequestException('Submission is not turned in');
    }

    const gradedSubmission = await this.submissionRepository.grade(
      studentId,
      postId,
      teacher.id,
      dto,
    );

    const formatted = NotificationTemplate.format('CLASSROOM_GRADE', {
      entityTitle: post.title || 'Assignment',
    });

    this.eventEmitter.emit(
      NotificationCreatedEvent.signature,
      new NotificationCreatedEvent({
        title: formatted.title,
        content: formatted.content,
        type: NotificationType.CLASSROOM.GRADE,
        organizationId: orgId,
        recipientId: studentId,
        actorId: teacher.id,
        entityId: classroomId,
        meta: { postId, submissionId: submission.id },
        actor: {
          id: teacher.id,
          name: teacher.name || '',
          image: teacher.image || null,
        },
      }),
    );

    return gradedSubmission;
  }
}
