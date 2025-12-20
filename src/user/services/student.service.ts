import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { AuthType } from 'src/auth/auth.factory';
import { AppRole } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { CreateStudentDto } from '../dto/create-student.dto';
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
}
