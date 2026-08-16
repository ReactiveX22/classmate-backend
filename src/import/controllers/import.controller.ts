import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { ERROR_CODES } from 'src/common/constants/error.codes';
import { OrganizationId } from 'src/common/decorators';
import { AppRole } from 'src/common/enums/role.enum';
import { ApplicationBadRequestException } from 'src/common/exceptions/application.exception';
import { OrganizationGuard } from 'src/common/guards';
import { type AppUserSession } from 'src/common/types/session.types';
import {
  IMPORT_DEFAULTS,
  IMPORT_FILE_TYPE_PATTERN,
  type ImportType,
} from '../import.constants';
import { ConfirmImportDto } from '../dto/confirm-import.dto';
import { ImportService } from '../services/import.service';

@Controller('imports')
@UseGuards(OrganizationGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post(':type/preview')
  @Roles([AppRole.Admin])
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: IMPORT_DEFAULTS.maxFileBytes, files: 1 },
    }),
  )
  async preview(
    @Param('type') type: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: IMPORT_DEFAULTS.maxFileBytes,
          }),
          new FileTypeValidator({
            fileType: IMPORT_FILE_TYPE_PATTERN,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @OrganizationId() organizationId: string,
    @Session() session: AppUserSession,
  ) {
    return this.importService.previewFile(
      organizationId,
      session.user.id,
      this.parseType(type),
      file,
    );
  }

  @Post(':type/confirm')
  @Roles([AppRole.Admin])
  async confirm(
    @Param('type') type: string,
    @Body() dto: ConfirmImportDto,
    @OrganizationId() organizationId: string,
    @Session() session: AppUserSession,
  ) {
    return this.importService.confirm(
      organizationId,
      session.user.id,
      this.parseType(type),
      dto.previewId,
    );
  }

  @Get('jobs/:id')
  @Roles([AppRole.Admin])
  async jobStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.importService.getJobStatus(organizationId, id);
  }

  @Get('jobs/:id/errors')
  @Roles([AppRole.Admin])
  async jobErrors(
    @Param('id', ParseUUIDPipe) id: string,
    @OrganizationId() organizationId: string,
    @Res() res: Response,
  ) {
    await this.importService.getJobErrors(organizationId, id, res);
  }

  @Get('templates/:type')
  @Roles([AppRole.Admin])
  template(@Param('type') type: string, @Res() res: Response) {
    const parsed = this.parseType(type);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${parsed}-import-template.csv"`,
    );
    res.send(this.importService.buildTemplate(parsed));
  }

  private parseType(value: string): ImportType {
    if (value !== 'student' && value !== 'teacher') {
      throw new ApplicationBadRequestException(
        'Type must be "student" or "teacher"',
        ERROR_CODES.INFRA.INPUT_VALIDATION,
      );
    }
    return value;
  }
}
