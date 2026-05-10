import { getQueueToken } from '@nestjs/bullmq';
import { NestFactory } from '@nestjs/core';
import { Queue } from 'bullmq';
import { sql } from 'drizzle-orm';
import { type DB, DB_PROVIDER } from '../../database/db.provider';
import { EmbeddingCommandModule } from '../embedding-command.module';
import {
  EMBEDDING_DEFAULTS,
  EMBEDDING_QUEUE_NAME,
} from '../embedding.constants';

async function bootstrap() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');

  console.log('--- Embedding Wipe: Clear All Tracking and Vectors ---');

  if (!execute) {
    console.log(
      'DRY RUN: No data will be deleted. Use --execute to run for real.',
    );
  }

  const app = await NestFactory.createApplicationContext(
    EmbeddingCommandModule,
    {
      logger: ['error', 'warn'],
    },
  );

  console.log('[1/3] Connecting to database and Redis...');
  const db = app.get<DB>(DB_PROVIDER);
  const queue = app.get<Queue>(getQueueToken(EMBEDDING_QUEUE_NAME));

  try {
    if (execute) {
      console.log('[2/3] Draining and obliterating embedding queue...');
      await queue.drain();
      await queue.obliterate({ force: true });
      console.log('      Queue cleared.');

      console.log('[3/3] Truncating database tables...');
      // Truncate tracking and vector store tables
      await db.execute(sql`TRUNCATE TABLE embedding_tracking CASCADE`);

      // We use the constants to ensure we hit the right tables
      const docTable = EMBEDDING_DEFAULTS.vectorTableName;
      const collectionTable = EMBEDDING_DEFAULTS.vectorCollectionTableName;

      await db.execute(sql.raw(`TRUNCATE TABLE ${docTable} CASCADE`));
      await db.execute(sql.raw(`TRUNCATE TABLE ${collectionTable} CASCADE`));

      console.log('SUCCESS: All embedding data has been wiped.');
    } else {
      console.log('WOULD: Drain BullMQ queue.');
      console.log('WOULD: Truncate embedding_tracking.');
      console.log(`WOULD: Truncate ${EMBEDDING_DEFAULTS.vectorTableName}.`);
    }
  } catch (error) {
    console.error('Failed to clear embeddings', error);
  }

  // Gracefully shutdown Nest
  app.close().catch(() => {});

  // Force exit after a short delay to allow some cleanup
  setTimeout(() => process.exit(0), 100).unref();
}

bootstrap().catch((err) => {
  console.error('Command failed', err);
  process.exit(1);
});
