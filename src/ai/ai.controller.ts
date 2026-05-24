import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  RequestMethod,
  Sse,
} from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { Observable } from 'rxjs';
import { AppRole } from 'src/common/enums/role.enum';
import { type AppUserSession } from 'src/common/types/session.types';
import { AiService } from './ai.service';
import { CreateAiChatDto } from './dto/create-ai-chat.dto';
import { SendAiChatDto } from './dto/send-ai-chat.dto';
import { RetryAiChatDto } from './dto/retry-ai-chat.dto';
import { UpdateAiConversationDto } from './dto/update-ai-conversation.dto';
import { VectorSearchDto } from './dto/vector-search.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Roles([AppRole.Instructor, AppRole.Student])
  @Post('chat/new')
  async chatNew(
    @Body() dto: CreateAiChatDto,
    @Session() session: AppUserSession,
  ) {
    return this.aiService.createChat(dto, session.user);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Sse('chat/stream', { [METHOD_METADATA]: RequestMethod.POST })
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  chatStream(
    @Body() dto: SendAiChatDto,
    @Session() session: AppUserSession,
  ): Observable<MessageEvent> {
    return this.aiService.streamChat(dto, session.user);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Sse('chat/stream/retry', { [METHOD_METADATA]: RequestMethod.POST })
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  retryChatStream(
    @Body() dto: RetryAiChatDto,
    @Session() session: AppUserSession,
  ): Observable<MessageEvent> {
    return this.aiService.retryStreamChat(dto, session.user);
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
  @Patch('conversations/:id')
  updateConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiConversationDto,
    @Session() session: AppUserSession,
  ) {
    return this.aiService.updateConversation(id, dto, session.user);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Delete('conversations')
  deleteAllConversations(@Session() session: AppUserSession) {
    return this.aiService.deleteAllConversations(session.user);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Delete('conversations/:id')
  deleteConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: AppUserSession,
  ) {
    return this.aiService.deleteConversation(id, session.user);
  }

  @Roles([AppRole.Instructor, AppRole.Student])
  @Post('vector-search')
  async vectorSearch(
    @Body() dto: VectorSearchDto,
    @Session() session: AppUserSession,
  ) {
    return this.aiService.vectorSearch(dto, session.user);
  }
}
