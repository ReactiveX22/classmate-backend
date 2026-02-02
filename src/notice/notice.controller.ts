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
import { OrganizationId } from 'src/common/decorators';
import { UploadAttachment } from 'src/common/decorators/upload-attachment.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticeService } from './notice.service';

@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Roles([
    AppRole.Admin,
    AppRole.SuperAdmin,
    AppRole.Instructor,
    AppRole.Student,
  ])
  @Get()
  async findAll(
    @Query() query: PaginationQueryDto,
    @OrganizationId() orgId: string,
  ) {
    return this.noticeService.findAll(query, orgId);
  }

  @Roles([AppRole.Admin, AppRole.SuperAdmin])
  @Post()
  async createNotice(
    @Body() dto: CreateNoticeDto,
    @Session() session: AppUserSession,
  ) {
    return this.noticeService.create(dto, session.user);
  }

  @Roles([AppRole.Admin, AppRole.SuperAdmin])
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateNotice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoticeDto,
    @Session() session: AppUserSession,
  ) {
    return this.noticeService.update(id, dto, session.user);
  }

  @Roles([AppRole.Admin, AppRole.SuperAdmin])
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotice(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: AppUserSession,
  ) {
    await this.noticeService.delete(id, session.user);
  }

  @Post('upload')
  @Roles([AppRole.Admin, AppRole.SuperAdmin])
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadAttachment() file: Express.Multer.File,
    @OrganizationId() orgId: string,
  ) {
    return this.noticeService.uploadAttachment(file, orgId);
  }

  @Delete('upload/:attachmentId')
  @Roles([AppRole.Admin, AppRole.SuperAdmin])
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('attachmentId') attachmentId: string,
    @OrganizationId() orgId: string,
  ) {
    await this.noticeService.deleteAttachment(orgId, attachmentId);
  }
}
