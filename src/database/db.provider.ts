import { FactoryProvider, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import { DatabaseService } from './database.service';
import * as schema from './schema';

export const DB_PROVIDER = 'DB_PROVIDER';
export const InjectDb = () => Inject(DB_PROVIDER);

export type DB = NodePgDatabase<typeof schema>;

export const dbProvider: FactoryProvider = {
  provide: DB_PROVIDER,
  inject: [DatabaseService],
  useFactory: (databaseService: DatabaseService): DB => {
    return databaseService.db;
  },
};

export type Transaction = PgTransaction<
  PgQueryResultHKT,
  typeof schema,
  Record<string, never>
>;
