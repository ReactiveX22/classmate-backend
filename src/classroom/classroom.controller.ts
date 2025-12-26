import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { OrganizationId } from 'src/common/decorators';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { ClassroomService } from './classroom.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';

@Roles([AppRole.Instructor])
@Controller('classrooms')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Get()
  async findAll(
    @Param() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.classroomService.findAll(query, orgId);
  }

  @Post()
  async create(
    @Body() dto: CreateClassroomDto,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return this.classroomService.create(dto, session.user.id, orgId);
  }
}
