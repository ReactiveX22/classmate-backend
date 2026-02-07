import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { type Response } from 'express';
import * as fs from 'fs';
import { join } from 'path';
import { ClassroomMemberGuard } from 'src/classroom/guard/classroom-member.guard';
import { ApplicationNotFoundException } from 'src/common/exceptions/application.exception';
import { type AppUserSession } from 'src/common/types/session.types';

@Controller('uploads')
export class StorageController {
  @Get('classroom-attachments/:classroomId/:fileName')
  @UseGuards(ClassroomMemberGuard)
  async serveClassroomFile(
    @Param('classroomId') classroomId: string,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const filePath = join(
      process.cwd(),
      'uploads',
      'classroom-attachments',
      classroomId,
      fileName,
    );

    // 1. Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new ApplicationNotFoundException('File not found');
    }

    // 2. Stream the file to the browser
    // This handles headers (Content-Type, etc.) automatically
    return res.sendFile(filePath);
  }

  @Get('profiles/:fileName')
  async serveProfileImage(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const filePath = join(process.cwd(), 'uploads', 'profiles', fileName);

    if (!fs.existsSync(filePath)) {
      throw new ApplicationNotFoundException('File not found');
    }
    return res.sendFile(filePath);
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

    const filePath = join(
      process.cwd(),
      'uploads',
      'notice-attachments',
      orgId,
      fileName,
    );

    if (!fs.existsSync(filePath)) {
      throw new ApplicationNotFoundException('File not found');
    }
    return res.sendFile(filePath);
  }
}
