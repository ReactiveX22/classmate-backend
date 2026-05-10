import {
  customType,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core';

// Custom bytea type for binary data (LangGraph stores Buffer/Uint8Array)
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return 'bytea';
  },
});

/**
 * ⚠️ LangGraph Checkpoint Tables
 * Auto-managed by @langchain/langgraph-checkpoint-postgres
 * Do not modify manually. Re-introspect if LangGraph updates its schema.
 */

export const checkpointMigrations = pgTable('checkpoint_migrations', {
  v: integer().primaryKey().notNull(),
});

export const checkpointBlobs = pgTable(
  'checkpoint_blobs',
  {
    threadId: text('thread_id').notNull(),
    checkpointNs: text('checkpoint_ns').default('').notNull(),
    channel: text().notNull(),
    version: text().notNull(),
    type: text().notNull(),
    blob: bytea('blob'),
  },
  (table) => [
    primaryKey({
      columns: [
        table.channel,
        table.checkpointNs,
        table.threadId,
        table.version,
      ],
      name: 'checkpoint_blobs_pkey',
    }),
  ],
);

export const checkpoints = pgTable(
  'checkpoints',
  {
    threadId: text('thread_id').notNull(),
    checkpointNs: text('checkpoint_ns').default('').notNull(),
    checkpointId: text('checkpoint_id').notNull(),
    parentCheckpointId: text('parent_checkpoint_id'),
    type: text(),
    checkpoint: jsonb().notNull(),
    metadata: jsonb().default({}).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.checkpointId, table.checkpointNs, table.threadId],
      name: 'checkpoints_pkey',
    }),
  ],
);

export const checkpointWrites = pgTable(
  'checkpoint_writes',
  {
    threadId: text('thread_id').notNull(),
    checkpointNs: text('checkpoint_ns').default('').notNull(),
    checkpointId: text('checkpoint_id').notNull(),
    taskId: text('task_id').notNull(),
    idx: integer().notNull(),
    channel: text().notNull(),
    type: text(),
    blob: bytea('blob').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.checkpointId,
        table.checkpointNs,
        table.idx,
        table.taskId,
        table.threadId,
      ],
      name: 'checkpoint_writes_pkey',
    }),
  ],
);
