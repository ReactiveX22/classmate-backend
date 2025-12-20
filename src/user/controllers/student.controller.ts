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
} from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
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
export class StudentController {
  constructor(
    private readonly userService: UserService,
    private readonly studentService: StudentService,
  ) {}

  @Get()
  @Roles([AppRole.Admin])
  async getAll(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.userService.getStudentsByOrganization(orgId, query);
  }

  @Post()
  @Roles([AppRole.Admin])
  async create(
    @Body() body: CreateStudentDto,
    @OrganizationId() orgId: string,
  ) {
    return this.studentService.createStudent(orgId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([AppRole.Admin])
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
  ) {
    await this.studentService.remove(orgId, id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles([AppRole.Admin])
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return await this.studentService.update(orgId, id, dto);
  }
}
