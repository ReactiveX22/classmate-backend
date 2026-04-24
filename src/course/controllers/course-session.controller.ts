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
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { AppRole } from 'src/common/enums/role.enum';
import { CreateCourseSessionDto } from '../dto/create-course-session.dto';
import { UpdateCourseSessionDto } from '../dto/update-course-session.dto';
import { CourseSessionService } from '../services/course-session.service';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { TenantCacheInterceptor } from 'src/cache/interceptors/tenant-cache.interceptor';
import { CacheResource } from 'src/cache/decorators/cache-resource.decorator';
import { InvalidateCache } from 'src/cache/decorators/invalidate-cache.decorator';

@ApiTags('Course Sessions')
@Controller('course-sessions')
@UseInterceptors(TenantCacheInterceptor)
export class CourseSessionController {
  constructor(private readonly courseSessionService: CourseSessionService) {}

  @Get()
  @CacheResource('course-sessions')
  @Roles([AppRole.Admin, AppRole.Instructor])
  async getAll(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.courseSessionService.getAll(orgId, query);
  }

  @Post()
  @InvalidateCache('course-sessions')
  @Roles([AppRole.Admin])
  async create(
    @Body() createDto: CreateCourseSessionDto,
    @OrganizationId() orgId: string,
  ) {
    return this.courseSessionService.create(createDto, orgId);
  }

  @Get(':id')
  @CacheResource('course-sessions')
  @Roles([AppRole.Admin, AppRole.Instructor])
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
  ) {
    return this.courseSessionService.findById(orgId, id);
  }

  @Patch(':id')
  @InvalidateCache('course-sessions')
  @HttpCode(HttpStatus.OK)
  @Roles([AppRole.Admin])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
    @Body() dto: UpdateCourseSessionDto,
  ) {
    return await this.courseSessionService.update(orgId, id, dto);
  }

  @Delete(':id')
  @InvalidateCache('course-sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([AppRole.Admin])
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
  ) {
    await this.courseSessionService.remove(orgId, id);
  }
}
