import { Body, Controller, Post } from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { CreateNoticeDto } from './dto/create-notice.dto';
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
}
