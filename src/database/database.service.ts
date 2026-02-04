import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public readonly db: NodePgDatabase<typeof schema>;
  private readonly pool: Pool;

  constructor(private configService: ConfigService) {
    const connectionString =
      this.configService.getOrThrow<string>('DATABASE_URL');

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      this.logger.log('Database connected successfully');
      client.release();
    } catch (error) {
      this.logger.error('Database connection failed at startup');
      this.logger.debug(error.message);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Closing database connections...');
    await this.pool.end();
  }
}
