import { FactoryProvider, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB_PROVIDER = 'DB_PROVIDER';

export const InjectDb = () => Inject(DB_PROVIDER);

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

export const dbProvider: FactoryProvider = {
  provide: DB_PROVIDER,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<DrizzleDB> => {
    const logger = new Logger('Database');

    const connectionString = configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      logger.error('DATABASE_URL is not defined in environment variables');
      throw new Error('DATABASE_URL is required');
    }

    const pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      //   ssl: true
    });

    try {
      const client = await pool.connect();
      logger.log('Database connected successfully');
      client.release();
    } catch (error) {
      logger.error('Database connection failed', error.stack);
      throw error;
    }

    return drizzle(pool, {
      schema,
      logger: true,
    });
  },
};
