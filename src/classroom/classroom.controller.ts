import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { ClassroomService } from './classroom.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

@Controller('classrooms')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Roles([AppRole.Instructor])
  @Get()
  async findAll(
    @Param() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.classroomService.findAll(query, orgId);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Get(':id')
  async findOne(@Param('id') id: string, @OrganizationId() orgId: string) {
    return this.classroomService.findOne(id, orgId);
  }

  @Roles([AppRole.Instructor])
  @Post()
  async create(
    @Body() dto: CreateClassroomDto,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return this.classroomService.create(dto, session.user.id, orgId);
  }

  @Roles([AppRole.Instructor])
  @Patch(':id')
  async update(
    @Body() dto: UpdateClassroomDto,
    @Param('id') id: string,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return this.classroomService.update(id, session.user.id, orgId, dto);
  }
}
