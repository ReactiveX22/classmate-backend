import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticeService } from './notice.service';

@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

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
}
