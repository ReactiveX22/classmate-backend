import { Controller, Get, Inject, Param, Res, UseGuards } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { type Response } from 'express';
import { ClassroomMemberGuard } from 'src/classroom/guard/classroom-member.guard';
import { ApplicationNotFoundException } from 'src/common/exceptions/application.exception';
import { type AppUserSession } from 'src/common/types/session.types';
import {
  STORAGE_STRATEGY,
  type StorageStrategy,
} from './interfaces/storage-strategy.interface';

@Controller('uploads')
export class StorageController {
  constructor(
    @Inject(STORAGE_STRATEGY)
    private readonly strategy: StorageStrategy,
  ) {}

  @Get('classroom-attachments/:classroomId/:fileName')
  @UseGuards(ClassroomMemberGuard)
  async serveClassroomFile(
    @Param('classroomId') classroomId: string,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    await this.strategy.serveFile(
      `classroom-attachments/${classroomId}`,
      fileName,
      res,
    );
  }

  @Get('profiles/:fileName')
  async serveProfileImage(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    await this.strategy.serveFile('profiles', fileName, res);
  }

  @Get('notice-attachments/:orgId/:fileName')
  async serveNoticeFile(
    @Param('orgId') orgId: string,
    @Param('fileName') fileName: string,
    @Session() session: AppUserSession,
    @Res() res: Response,
  ) {
    if (session.user.organizationId !== orgId) {
      throw new ApplicationNotFoundException('File not found');
    }

    await this.strategy.serveFile(`notice-attachments/${orgId}`, fileName, res);
  }
}
