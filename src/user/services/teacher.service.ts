import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { AuthType } from 'src/auth/auth.factory';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { TeacherRepository } from '../repositories/teacher.repository';
import { UserService } from './user.service';

@Injectable()
export class TeacherService {
  constructor(
    private readonly authService: AuthService<AuthType>,
    private readonly teacherRepository: TeacherRepository,
    private readonly userService: UserService,
  ) {}

  async remove(orgId: string, teacherId: string) {
    const teacherWithUser =
      await this.teacherRepository.findByIdWithUser(teacherId);

    if (!teacherWithUser) throw new ApplicationNotFoundException();

    if (orgId !== teacherWithUser?.user.organizationId) {
      throw new ApplicationForbiddenException(
        'Organization Mismatch',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    await this.userService.remove(teacherWithUser.user.id);
  }
}
