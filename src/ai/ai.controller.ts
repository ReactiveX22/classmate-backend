import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  MessageEvent,
  Param,
  ParseUUIDPipe,
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
import { SendAiChatDto } from './dto/send-ai-chat.dto';
import { VectorSearchDto } from './dto/vector-search.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Roles([AppRole.Instructor, AppRole.Student])
  @Post('chat')
  chat(@Body() dto: SendAiChatDto, @Session() session: AppUserSession) {
    return this.aiService.chat(dto, session.user);
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
