import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService, Roles, Session } from '@thallesp/nestjs-better-auth';
import { type AuthType } from 'src/auth/auth.factory';
import { AppRole } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { UserService } from '../services/user.service';
import { type AppUserSession } from 'src/common/types/session.types';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { OrganizationGuard } from 'src/common/guards';
import { OrganizationId } from 'src/common/decorators';

@Controller('teachers')
@UseGuards(OrganizationGuard)
export class TeacherController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService<AuthType>,
  ) {}

  @Post()
  @Roles([AppRole.Admin])
  async create(
    @Body() dto: CreateTeacherDto,
    @Session() session: AppUserSession,
  ) {
    const { user } = await this.authService.api.createUser({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        data: {
          organizationId: session.user.organizationId,
          status: UserStatus.Active,
        },
        role: AppRole.Instructor as any,
      },
    });

    const teacher = await this.userService.createTeacher({
      userId: user.id,
      title: dto.title,
      joinDate: dto.joinDate,
    });

    return {
      user,
      teacher,
    };
  }

  @Get()
  @Roles([AppRole.Admin])
  async getALl(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.userService.getTeachersByOrganization(orgId, query);
  }
}
