import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';
import { DB_PROVIDER, dbProvider } from './db.provider';

@Module({
  imports: [ConfigModule],
  providers: [dbProvider],
  exports: [dbProvider, DB_PROVIDER],
})
export class DatabaseModule {}
