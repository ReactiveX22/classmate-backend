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
import { Roles } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CourseService } from '../services/course.service';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { TenantCacheInterceptor } from 'src/cache/interceptors/tenant-cache.interceptor';
import { CacheResource } from 'src/cache/decorators/cache-resource.decorator';
import { InvalidateCache } from 'src/cache/decorators/invalidate-cache.decorator';

@Controller('courses')
@UseInterceptors(TenantCacheInterceptor)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  @CacheResource('courses')
  @Roles([AppRole.Admin, AppRole.Instructor])
  async getAll(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.courseService.getAllCourses(orgId, query);
  }

  @Post()
  @InvalidateCache('courses')
  @Roles([AppRole.Admin])
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @OrganizationId() orgId: string,
  ) {
    return this.courseService.createCourse(createCourseDto, orgId);
  }

  @Get(':id')
  @CacheResource('courses')
  @Roles([AppRole.Admin, AppRole.Instructor])
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
  ) {
    return this.courseService.getCourseById(orgId, id);
  }

  @Patch(':id')
  @InvalidateCache('courses')
  @HttpCode(HttpStatus.OK)
  @Roles([AppRole.Admin])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return await this.courseService.update(orgId, id, dto);
  }

  @Delete(':id')
  @InvalidateCache('courses')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([AppRole.Admin])
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
  ) {
    await this.courseService.remove(orgId, id);
  }
}
