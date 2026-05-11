import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClassroomPostRepository } from '../classroom/repositories/classroom-post.repository';
import { DatabaseModule } from '../database/database.module';
import { EMBEDDING_QUEUE_NAME } from './embedding.constants';
import { EmbeddingTrackingRepository } from './repositories/embedding-tracking.repository';
import { EmbeddingJobService } from './services/embedding-job.service';
import { EmbeddingModelService } from './services/embedding-model.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('QUEUE_REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: EMBEDDING_QUEUE_NAME,
    }),
  ],
  providers: [
    ClassroomPostRepository,
    EmbeddingTrackingRepository,
    EmbeddingModelService,
    EmbeddingJobService,
  ],
})
export class EmbeddingCommandModule {}
