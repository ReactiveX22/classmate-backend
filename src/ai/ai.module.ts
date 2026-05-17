import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { ClassroomModule } from 'src/classroom/classroom.module';
import { DatabaseModule } from 'src/database/database.module';
import { EmbeddingModule } from 'src/embedding/embedding.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiConversationRepository } from './repositories/ai-conversation.repository';
import { AiContextService } from './services/ai-context.service';
import { LlmService } from './services/llm.service';
import { PromptLoaderService } from './services/prompt-loader.service';
import { AiToolsRegistry } from './tools/ai-tools-registry.service';
import { ClassroomToolsService } from './tools/classroom-tools.service';
import { RagToolsService } from './tools/rag-tools.service';
import { AiProviderService } from './services/ai-provider.service';

export const AI_PG_POOL = 'AI_PG_POOL';

@Module({
  imports: [DatabaseModule, ConfigModule, EmbeddingModule, ClassroomModule],
  controllers: [AiController],
  providers: [
    /**
     * Dedicated pg.Pool for the LangGraph PostgresSaver checkpointer.
     * Kept separate from the main Drizzle pool (80 conns) so checkpoint
     * writes never starve application DB traffic.
     * Budget: 20 connections (80 + 20 = 100 total max).
     */
    {
      provide: AI_PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Pool => {
        return new Pool({
          connectionString: configService.get<string>('DATABASE_URL'),
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
      },
    },
    PromptLoaderService,
    AiService,
    AiConversationRepository,
    AiContextService,
    AiProviderService,
    LlmService,
    RagToolsService,
    ClassroomToolsService,
    AiToolsRegistry,
  ],
})
export class AiModule {}
