import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService, Roles, Session } from '@thallesp/nestjs-better-auth';
import { type AuthType } from 'src/auth/auth.factory';
import { CacheResource } from 'src/cache/decorators/cache-resource.decorator';
import { InvalidateCache } from 'src/cache/decorators/invalidate-cache.decorator';
import { TenantCacheInterceptor } from 'src/cache/interceptors/tenant-cache.interceptor';
import { OrganizationId } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { OrganizationGuard } from 'src/common/guards';
import { type AppUserSession } from 'src/common/types/session.types';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';
import { TeacherService } from '../services/teacher.service';
import { UserService } from '../services/user.service';

@Controller('teachers')
@UseGuards(OrganizationGuard)
@UseInterceptors(TenantCacheInterceptor)
export class TeacherController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService<AuthType>,
    private readonly teacherService: TeacherService,
  ) {}

  @Post()
  @InvalidateCache('teachers')
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
  @CacheResource('teachers')
  @Roles([AppRole.Admin])
  async getALl(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return await this.userService.getTeachersByOrganization(orgId, query);
  }

  @Delete(':id')
  @InvalidateCache('teachers')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([AppRole.Admin])
  async remove(@Param('id') id: string, @OrganizationId() orgId: string) {
    await this.teacherService.remove(orgId, id);
  }

  @Patch(':id')
  @InvalidateCache('teachers')
  @HttpCode(HttpStatus.OK)
  @Roles([AppRole.Admin])
  async update(
    @Param('id') id: string,
    @OrganizationId() orgId: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return await this.teacherService.update(orgId, id, dto);
  }
}
