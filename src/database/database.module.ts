import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';
import { DB_PROVIDER, dbProvider } from './db.provider';
import { DatabaseService } from './database.service';

@Module({
  imports: [ConfigModule],
  providers: [dbProvider, DatabaseService],
  exports: [dbProvider, DB_PROVIDER],
})
export class DatabaseModule {}
