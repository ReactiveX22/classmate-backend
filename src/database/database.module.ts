import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { dbProvider } from './db.provider';
import { ConfigModule } from 'src/config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [DatabaseService, dbProvider],
})
export class DatabaseModule {}
