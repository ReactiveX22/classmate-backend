import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { SelectTeacher, user } from 'src/database/schema';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';
import { TeacherRepository } from '../repositories/teacher.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { UserService } from './user.service';

@Injectable()
export class TeacherService {
  constructor(
    private readonly teacherRepository: TeacherRepository,
    private readonly userService: UserService,
    private readonly userProfileRepository: UserProfileRepository,
  ) {}

  async findTeacherInOrg(teacherId: string, orgId: string) {
    const result = await this.teacherRepository.findByIdWithUser(teacherId);
    if (!result || result.user.organizationId !== orgId) {
      throw new ApplicationNotFoundException(
        'Teacher not found in your organization',
        ERROR_CODES.TEACHER.NOT_FOUND_IN_ORG,
      );
    }
    return result;
  }

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

  async update(orgId: string, teacherId: string, dto: UpdateTeacherDto) {
    const teacherWithUser =
      await this.teacherRepository.findByIdWithUser(teacherId);

    if (!teacherWithUser) throw new ApplicationNotFoundException();

    if (orgId !== teacherWithUser?.user.organizationId) {
      throw new ApplicationForbiddenException(
        'Organization Mismatch',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    const { email, name, title, joinDate, status, phone } = dto;
    const userData = this.filterUndefined({ email, name, status });
    const teacherData = this.filterUndefined({ title, joinDate });

    let updatedTeacher: SelectTeacher | null = null;
    let updatedUser: typeof user.$inferSelect | null = null;

    if (Object.keys(teacherData).length > 0) {
      updatedTeacher = await this.teacherRepository.update(
        teacherId,
        teacherData,
      );
    }

    if (Object.keys(userData).length > 0) {
      updatedUser = await this.userService.update(
        teacherWithUser.user.id,
        userData,
      );
    }

    if (phone !== undefined) {
      await this.userProfileRepository.save({
        userId: teacherWithUser.user.id,
        phone,
      });
    }

    return {
      user: updatedUser || teacherWithUser.user,
      teacher: updatedTeacher || teacherWithUser.teacher,
    };
  }

  private filterUndefined(obj: Record<string, any>) {
    Object.keys(obj).forEach(
      (key) => obj[key] === undefined && delete obj[key],
    );

    return obj;
  }
}
