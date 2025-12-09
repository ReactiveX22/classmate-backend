import { drizzle } from 'drizzle-orm/node-postgres';
import { ConfigService } from '@nestjs/config';
import * as schema from './schema';
import { FactoryProvider } from '@nestjs/common';
import { Pool } from 'pg';

export const DRIZZLE_ORM = 'DRIZZLE_ORM';

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

export const drizzleProvider: FactoryProvider = {
  provide: DRIZZLE_ORM,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): DrizzleDB => {
    const pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
      //   ssl: true
    });
    return drizzle(pool, {
      schema,
      logger: true,
    });
  },
};
