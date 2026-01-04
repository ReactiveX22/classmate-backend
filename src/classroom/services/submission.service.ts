import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { CreateSubmissionDto } from '../dto/create-assignment-submission.dto';
import { SubmissionRepository } from '../repositories/submission.repository';
import { ClassroomService } from './classroom.service';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly classroomService: ClassroomService,
    private readonly storageService: StorageService,
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

  async fetch(userId: string, postId: string) {
    return await this.submissionRepository.fetchOneByUser(userId, postId);
  }

  async unsubmit(classroomId: string, postId: string, userId: string) {
    const submission = await this.fetch(userId, postId);

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
}
