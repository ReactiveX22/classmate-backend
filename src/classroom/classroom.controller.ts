import { Body, Controller, Post } from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { AppRole } from 'src/common/enums/role.enum';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { type AppUserSession } from 'src/common/types/session.types';
import { OrganizationId } from 'src/common/decorators';

@Roles([AppRole.Instructor])
@Controller('classrooms')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Post()
  async create(
    @Body() dto: CreateClassroomDto,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return this.classroomService.create(dto, session.user.id, orgId);
  }
}
