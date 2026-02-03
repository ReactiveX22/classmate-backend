import { FactoryProvider, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB_PROVIDER = 'DB_PROVIDER';

export const InjectDb = () => Inject(DB_PROVIDER);

export type DB = ReturnType<typeof drizzle<typeof schema>>;

export const dbProvider: FactoryProvider = {
  provide: DB_PROVIDER,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<DB> => {
    const logger = new Logger('Database');

    const connectionString = configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      logger.error('DATABASE_URL is not defined in environment variables');
      throw new Error('DATABASE_URL is required');
    }

    const pool = new Pool({
      connectionString,
      max: 100,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      maxUses: 7500,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on database client', err.stack);
    });

    try {
      const client = await pool.connect();
      logger.log('Database connected successfully');
      client.release();
    } catch (error) {
      logger.error('Database connection failed at startup.');
      logger.debug(error.message);
    }

    return drizzle(pool, {
      schema,
      logger: false,
    });
  },
};

export type Transaction = PgTransaction<
  PgQueryResultHKT,
  typeof schema,
  Record<string, never>
>;
