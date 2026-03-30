import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { AuthType } from 'src/auth/auth.factory';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import { AppRole } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import {
  ApplicationForbiddenException,
  ApplicationNotFoundException,
} from 'src/common/exceptions/application.exception';
import { SelectStudent, user } from 'src/database/schema';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentRepository } from '../repositories/student.repository';
import { UserService } from './user.service';

@Injectable()
export class StudentService {
  constructor(
    private readonly authService: AuthService<AuthType>,
    private readonly studentRepository: StudentRepository,
    private readonly userService: UserService,
  ) {}

  async createStudent(orgId: string, dto: CreateStudentDto) {
    const { user } = await this.authService.api.createUser({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        data: {
          organizationId: orgId,
          status: UserStatus.Active,
        },
        role: AppRole.Student as any,
      },
    });

    try {
      const student = await this.studentRepository.create({
        userId: user.id,
        studentId: dto.studentId,
      });
      return {
        user,
        student,
      };
    } catch (error) {
      await this.userService.remove(user.id);
      throw error;
    }
  }

  async remove(orgId: string, studentId: string) {
    const studentWithUser =
      await this.studentRepository.findByIdWithUser(studentId);

    if (!studentWithUser) throw new ApplicationNotFoundException();

    if (orgId !== studentWithUser?.user.organizationId) {
      throw new ApplicationForbiddenException(
        'Organization Mismatch',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    await this.userService.remove(studentWithUser.user.id);
  }

  async update(orgId: string, studentId: string, dto: UpdateStudentDto) {
    const studentWithUser =
      await this.studentRepository.findByIdWithUser(studentId);

    if (!studentWithUser) throw new ApplicationNotFoundException();

    if (orgId !== studentWithUser?.user.organizationId) {
      throw new ApplicationForbiddenException(
        'Organization Mismatch',
        ERROR_CODES.ORGANIZATION.ACCESS_DENIED,
      );
    }

    const { email, name, studentId: studentIdNumber, status } = dto;
    const userData = this.filterUndefined({ email, name, status });
    const studentData = this.filterUndefined({ studentId: studentIdNumber });

    let updatedStudent: SelectStudent | null = null;
    let updatedUser: typeof user.$inferSelect | null = null;

    if (Object.keys(studentData).length > 0) {
      updatedStudent = await this.studentRepository.update(
        studentId,
        studentData,
      );
    }

    if (Object.keys(userData).length > 0) {
      updatedUser = await this.userService.update(
        studentWithUser.user.id,
        userData,
      );
    }

    return {
      user: updatedUser || studentWithUser.user,
      student: updatedStudent || studentWithUser.student,
    };
  }

  private filterUndefined(obj: Record<string, any>) {
    Object.keys(obj).forEach(
      (key) => obj[key] === undefined && delete obj[key],
    );

    return obj;
  }
}
