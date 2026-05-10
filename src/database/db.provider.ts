import { FactoryProvider, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB_PROVIDER = 'DB_PROVIDER';
export const DB_POOL_TOKEN = 'DB_POOL_TOKEN';

export const InjectDb = () => Inject(DB_PROVIDER);
export const InjectDbPool = () => Inject(DB_POOL_TOKEN);

export type DB = NodePgDatabase<typeof schema>;

/**
 * Raw pg.Pool provider — shared by the Drizzle DB provider.
 * Exported so other modules can reuse the same pool reference if needed.
 * Max connections: 80 (the remaining 20 are reserved for the LangGraph AI pool).
 */
export const dbPoolProvider: FactoryProvider<Pool> = {
  provide: DB_POOL_TOKEN,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Pool => {
    const logger = new Logger('Database');

    const connectionString = configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      logger.error('DATABASE_URL is not defined in environment variables');
      throw new Error('DATABASE_URL is required');
    }

    const pool = new Pool({
      connectionString,
      max: 80,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      maxUses: 7500,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on database client', err.stack);
    });

    pool
      .connect()
      .then((client) => {
        logger.log('Database connected successfully');
        client.release();
      })
      .catch((error: Error) => {
        logger.error('Database connection failed at startup.');
        logger.debug(error.message);
        throw error;
      });

    return pool;
  },
};

/**
 * Drizzle ORM provider — wraps the shared pg.Pool with the full schema.
 */
export const dbProvider: FactoryProvider<DB> = {
  provide: DB_PROVIDER,
  inject: [DB_POOL_TOKEN],
  useFactory: (pool: Pool): DB => {
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
