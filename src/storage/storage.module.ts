import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { STORAGE_STRATEGY } from './interfaces/storage-strategy.interface';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { LocalStorageStrategy } from './strategies/local-storage.strategy';
import { MinioStorageStrategy } from './strategies/minio-storage.strategy';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    StorageService,
    {
      provide: STORAGE_STRATEGY,
      useFactory: (configService: ConfigService) => {
        const service = configService.get<string>('STORAGE_SERVICE', 'local');

        switch (service.toLowerCase()) {
          case 'minio':
          case 's3':
            return new MinioStorageStrategy(
              configService.get('STORAGE_ENDPOINT') || '',
              configService.get('STORAGE_REGION') || 'us-east-1',
              configService.get('STORAGE_ACCESS_KEY') || '',
              configService.get('STORAGE_SECRET_KEY') || '',
              configService.get('STORAGE_BUCKET') || 'classmate',
              configService.get('APP_URL', 'http://localhost:3000'),
            );
          case 'local':
          default:
            return new LocalStorageStrategy(
              configService.get('APP_URL', 'http://localhost:3000'),
            );
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
  controllers: [StorageController],
})
export class StorageModule {}
