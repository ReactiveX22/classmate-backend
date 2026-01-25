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
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { CreateClassroomPostDto } from 'src/classroom/dto/create-classroom-post.dto';
import { OrganizationId } from 'src/common/decorators';
import { UploadAttachment } from 'src/common/decorators/upload-attachment.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { AddMembersClassroomDto } from '../dto/addMembers-classroom.dto';
import { CreateClassroomDto } from '../dto/create-classroom.dto';
import { JoinClassroomDto } from '../dto/join-classroom.dto';
import { UpdateClassroomPostDto } from '../dto/update-classroom-post.dto';
import { UpdateClassroomDto } from '../dto/update-classroom.dto';
import { ClassroomService } from '../services/classroom.service';

@Controller('classrooms')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Roles([AppRole.Instructor, AppRole.Student])
  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return this.classroomService.findAll(
      query,
      orgId,
      session.user.id,
      session.user.role as AppRole,
    );
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Get(':id')
  async findOne(@Param('id') id: string, @OrganizationId() orgId: string) {
    return this.classroomService.findOne(id, orgId);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Get(':id/upcoming-posts')
  async getUpcomingPosts(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return await this.classroomService.getUpcomingPosts(
      id,
      session.user.id,
      orgId,
      session.user.role as AppRole,
    );
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

  @Roles([AppRole.Instructor])
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return this.classroomService.delete(id, session.user.id, orgId);
  }

  @Roles([AppRole.Instructor])
  @Post(':id/members')
  async addMembers(
    @Param('id') id: string,
    @Body() dto: AddMembersClassroomDto,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return this.classroomService.addMembers(id, session.user.id, orgId, dto);
  }

  @Roles([AppRole.Instructor])
  @Delete(':id/members')
  @HttpCode(HttpStatus.NO_CONTENT)
  async bulkRemoveMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMembersClassroomDto,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    this.classroomService.removeMembers(id, session.user.id, orgId, dto);
  }

  @Roles([AppRole.Student])
  @Post(':id/members/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveClassroom(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    await this.classroomService.leaveClassroom(id, session.user.id, orgId);
  }

  @Post(':id/posts/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadAttachment() file: Express.Multer.File,
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() orgId: string,
  ) {
    return await this.classroomService.uploadAttachment(file, id, orgId);
  }

  @Post(':id/posts/')
  async createPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateClassroomPostDto,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return await this.classroomService.createPost(
      id,
      session.user.id,
      body,
      orgId,
    );
  }

  @Patch(':id/posts/:postId')
  async updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() body: UpdateClassroomPostDto,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return await this.classroomService.updatePost(
      id,
      postId,
      session.user.id,
      body,
      orgId,
    );
  }

  @Get(':id/posts/:postId')
  async findPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @OrganizationId() orgId: string,
    @Session() session: AppUserSession,
  ) {
    return await this.classroomService.findPost(
      id,
      orgId,
      postId,
      session.user.id,
    );
  }

  @Delete(':id/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @OrganizationId() orgId: string,
  ) {
    await this.classroomService.deletePost(id, orgId, postId);
  }

  @Delete(':id/posts/upload/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId') attachmentId: string,
    @OrganizationId() orgId: string,
  ) {
    await this.classroomService.deleteAttachment(id, orgId, attachmentId);
  }

  @Roles([AppRole.Student])
  @Post('join')
  async joinClassroom(
    @Body() dto: JoinClassroomDto,
    @Session() session: AppUserSession,
    @OrganizationId() orgId: string,
  ) {
    return await this.classroomService.joinClassroom(
      dto,
      session.user.id,
      orgId,
    );
  }

  @Roles([AppRole.Instructor])
  @Get(':classroomId/students/:studentId/grade-stats')
  async getStudentGradeStats(
    @Param('studentId') studentId: string,
    @Param('classroomId') classroomId: string,
  ) {
    return await this.classroomService.getStudentGradeStats(
      classroomId,
      studentId,
    );
  }
}
