import { Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigModule } from 'src/config/config.module';
import {
  DB_POOL_TOKEN,
  DB_PROVIDER,
  dbPoolProvider,
  dbProvider,
  InjectDbPool,
} from './db.provider';

@Module({
  imports: [ConfigModule],
  providers: [dbPoolProvider, dbProvider],
  exports: [dbProvider, DB_PROVIDER, dbPoolProvider, DB_POOL_TOKEN],
})
export class DatabaseModule implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@InjectDbPool() private readonly pool: Pool) {}

  async onModuleDestroy() {
    this.logger.log('Closing database connection pool...');
    await this.pool.end();
  }
}
