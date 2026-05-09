import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiConversationRepository } from './repositories/ai-conversation.repository';
import { AiContextService } from './services/ai-context.service';
import { LlmService } from './services/llm.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiConversationRepository,
    AiContextService,
    LlmService,
  ],
})
export class AiModule {}
