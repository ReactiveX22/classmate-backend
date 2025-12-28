import { Injectable } from '@nestjs/common';
import { ClassroomService } from 'src/classroom/classroom.service';
import { ApplicationNotFoundException } from 'src/common/exceptions/application.exception';
import { ClassroomPostRepository } from './classroom-post.repository';

@Injectable()
export class ClassroomPostService {
  constructor(
    private readonly classroomPostRepository: ClassroomPostRepository,
    private readonly classroomService: ClassroomService,
  ) {}

  async create(body: any, orgId: string, authorId: string) {
    // classroom exist and match orgId
    const classroom = await this.classroomService.findOne(
      body.classroomId,
      orgId,
    );
    if (!classroom) {
      throw new ApplicationNotFoundException(
        'Classroom not found or does not belong to the organization',
      );
    }

    return await this.classroomPostRepository.create(body, authorId);
  }
}
