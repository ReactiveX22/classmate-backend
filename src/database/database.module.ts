import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';
import { DatabaseService } from './database.service';
import {
  DB_POOL_TOKEN,
  DB_PROVIDER,
  dbPoolProvider,
  dbProvider,
} from './db.provider';

@Module({
  imports: [ConfigModule],
  providers: [dbPoolProvider, dbProvider, DatabaseService],
  exports: [dbProvider, DB_PROVIDER, dbPoolProvider, DB_POOL_TOKEN],
})
export class DatabaseModule {}
