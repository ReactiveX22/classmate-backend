import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseModule } from 'src/database/database.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiConversationRepository } from './repositories/ai-conversation.repository';
import { AiContextService } from './services/ai-context.service';
import { LlmService } from './services/llm.service';

export const AI_PG_POOL = 'AI_PG_POOL';

@Module({
  imports: [DatabaseModule, ConfigModule],
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
    AiService,
    AiConversationRepository,
    AiContextService,
    LlmService,
  ],
})
export class AiModule {}
