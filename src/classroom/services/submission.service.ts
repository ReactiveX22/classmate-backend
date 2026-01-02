import { Injectable } from '@nestjs/common';
import { CreateSubmissionDto } from '../dto/create-assignment-submission.dto';
import { SubmissionRepository } from '../repositories/submission.repository';
import { ClassroomService } from './classroom.service';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly classroomService: ClassroomService,
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
    );

    return await this.submissionRepository.create({
      postId: post.id,
      studentId: userId,
      content: dto.content,
      attachments: dto.attachments,
    });
  }
}
