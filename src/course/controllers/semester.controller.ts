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
import { CreateSemesterDto } from '../dto/create-semester.dto';
import { UpdateSemesterDto } from '../dto/update-semester.dto';
import { SemesterService } from '../services/semester.service';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { TenantCacheInterceptor } from 'src/cache/interceptors/tenant-cache.interceptor';
import { CacheResource } from 'src/cache/decorators/cache-resource.decorator';
import { InvalidateCache } from 'src/cache/decorators/invalidate-cache.decorator';

@ApiTags('Semesters')
@Controller('semesters')
@UseInterceptors(TenantCacheInterceptor)
export class SemesterController {
  constructor(private readonly semesterService: SemesterService) {}

  @Get()
  @CacheResource('semesters')
  @Roles([AppRole.Admin, AppRole.Instructor])
  async getAll(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.semesterService.getAll(orgId, query);
  }

  @Post()
  @InvalidateCache('semesters')
  @Roles([AppRole.Admin])
  async create(
    @Body() createSemesterDto: CreateSemesterDto,
    @OrganizationId() orgId: string,
  ) {
    return this.semesterService.create(createSemesterDto, orgId);
  }

  @Get(':id')
  @CacheResource('semesters')
  @Roles([AppRole.Admin, AppRole.Instructor])
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
  ) {
    return this.semesterService.findById(orgId, id);
  }

  @Patch(':id')
  @InvalidateCache('semesters')
  @HttpCode(HttpStatus.OK)
  @Roles([AppRole.Admin])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
    @Body() dto: UpdateSemesterDto,
  ) {
    return await this.semesterService.update(orgId, id, dto);
  }

  @Delete(':id')
  @InvalidateCache('semesters')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([AppRole.Admin])
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
  ) {
    await this.semesterService.remove(orgId, id);
  }
}
