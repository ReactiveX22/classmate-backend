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
import { Roles } from '@thallesp/nestjs-better-auth';
import { CacheResource } from 'src/cache/decorators/cache-resource.decorator';
import { InvalidateCache } from 'src/cache/decorators/invalidate-cache.decorator';
import { TenantCacheInterceptor } from 'src/cache/interceptors/tenant-cache.interceptor';
import { OrganizationId } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { OrganizationGuard } from 'src/common/guards';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentService } from '../services/student.service';
import { UserService } from '../services/user.service';

@Controller('students')
@UseGuards(OrganizationGuard)
@UseInterceptors(TenantCacheInterceptor)
export class StudentController {
  constructor(
    private readonly userService: UserService,
    private readonly studentService: StudentService,
  ) {}

  @Get()
  @CacheResource('students')
  @Roles([AppRole.Admin, AppRole.Instructor])
  async getAll(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.userService.getStudentsByOrganization(orgId, query);
  }

  @Post()
  @InvalidateCache('students')
  @Roles([AppRole.Admin])
  async create(
    @Body() body: CreateStudentDto,
    @OrganizationId() orgId: string,
  ) {
    return this.studentService.createStudent(orgId, body);
  }

  @Delete(':id')
  @InvalidateCache('students')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([AppRole.Admin])
  async remove(@Param('id') id: string, @OrganizationId() orgId: string) {
    await this.studentService.remove(orgId, id);
  }

  @Patch(':id')
  @InvalidateCache('students')
  @HttpCode(HttpStatus.OK)
  @Roles([AppRole.Admin])
  async update(
    @Param('id') id: string,
    @OrganizationId() orgId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return await this.studentService.update(orgId, id, dto);
  }
}
