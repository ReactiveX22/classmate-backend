import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { AiService } from './ai.service';
import { CreateAiConversationDto } from './dto/create-ai-conversation.dto';
import { SendAiMessageDto } from './dto/send-ai-message.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Roles([AppRole.Instructor, AppRole.Student])
  @Post('conversations')
  createConversation(
    @Body() dto: CreateAiConversationDto,
    @Session() session: AppUserSession,
  ) {
    return this.aiService.createConversation(dto, session.user);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Get('conversations')
  findConversations(@Session() session: AppUserSession) {
    return this.aiService.findConversations(session.user);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Get('conversations/:id')
  findConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: AppUserSession,
  ) {
    return this.aiService.findConversation(id, session.user);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendAiMessageDto,
    @Session() session: AppUserSession,
  ) {
    return this.aiService.sendMessage(id, dto, session.user);
  }
}
