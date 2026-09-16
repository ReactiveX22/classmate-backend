import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { IMPORT_QUEUE_NAME } from './import.constants';
import { ImportController } from './controllers/import.controller';
import { ImportProcessor } from './processors/import.processor';
import { ImportJobRepository } from './repositories/import-job.repository';
import { ImportJobService } from './services/import-job.service';
import { ImportParserService } from './services/import-parser.service';
import { ImportService } from './services/import.service';
import { ImportValidationService } from './services/import-validation.service';

@Module({
  imports: [
    StorageModule,
    ConfigModule,
    DatabaseModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url:
            configService.get<string>('QUEUE_REDIS_URL') ||
            configService.get<string>('CACHE_REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: IMPORT_QUEUE_NAME,
    }),
  ],
  controllers: [ImportController],
  providers: [
    ImportService,
    ImportJobService,
    ImportJobRepository,
    ImportParserService,
    ImportValidationService,
    ImportProcessor,
  ],
})
export class ImportModule {}
