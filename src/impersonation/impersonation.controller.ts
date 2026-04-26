import {
  Body,
  Controller,
  ForbiddenException,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  AuthGuard,
  AuthService,
  Session,
  UserSession,
} from '@thallesp/nestjs-better-auth';
import { IsNotEmpty, IsString } from 'class-validator';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { AppRole } from 'src/common/enums/role.enum';
import { type DB, InjectDb } from 'src/database/db.provider';
import { user } from 'src/database/schema';

class StartImpersonationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

@Controller('impersonation')
@UseGuards(AuthGuard)
export class ImpersonationController {
  private readonly logger = new Logger(ImpersonationController.name);

  constructor(
    private readonly authService: AuthService,
    @InjectDb() private readonly db: DB,
  ) {}

  @Post('start')
  async start(
    @Body() body: StartImpersonationDto,
    @Session() session: UserSession,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (
      session.user.role !== AppRole.Admin &&
      session.user.role !== AppRole.SuperAdmin
    ) {
      throw new ForbiddenException('Only admins can impersonate users');
    }

    const targetUsers = await this.db
      .select()
      .from(user)
      .where(eq(user.id, body.userId))
      .limit(1);
    const targetUser = targetUsers[0];

    if (!targetUser) {
      throw new ForbiddenException('Target user not found');
    }

    if (
      targetUser.organizationId &&
      targetUser.organizationId !== session.user.organizationId
    ) {
      this.logger.warn(
        `[AUDIT] Security Violation: Admin ${session.user.id} attempted to impersonate user ${targetUser.id} outside their organization.`,
      );
      throw new ForbiddenException(
        'Cannot impersonate a user outside of your organization',
      );
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else if (value) {
        headers.set(key, value);
      }
    }

    const impersonationResponse = (await this.authService.api.impersonateUser({
      body: { userId: targetUser.id },
      headers,
      asResponse: true,
    })) as globalThis.Response;

    if (!impersonationResponse || !impersonationResponse.ok) {
      throw new ForbiddenException('Failed to impersonate user');
    }

    // Forward cookies
    const setCookieHeaders =
      impersonationResponse.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      res.setHeader('Set-Cookie', setCookieHeaders);
    }

    this.logger.log(
      `[AUDIT] Admin (ID: ${session.user.id}, Org: ${session.user.organizationId}) successfully started impersonating User (ID: ${targetUser.id}).`,
    );

    return res.status(200).json({ success: true });
  }

  @Post('stop')
  async stop(@Req() req: Request, @Res() res: Response) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else if (value) {
        headers.set(key, value);
      }
    }

    const stopResponse = (await this.authService.api.stopImpersonating({
      headers,
      asResponse: true,
    })) as globalThis.Response;

    if (stopResponse && stopResponse.ok) {
      const setCookieHeaders = stopResponse.headers.getSetCookie?.() || [];
      if (setCookieHeaders.length > 0) {
        res.setHeader('Set-Cookie', setCookieHeaders);
      }
    }

    this.logger.log(`[AUDIT] Admin ended impersonation session.`);

    return res.status(200).json({ success: true });
  }
}
