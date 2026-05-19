import { foreignKey, index } from 'drizzle-orm/pg-core';
import {
  jsonb,
  pgTable,
  text,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';

export const embeddingCollections = pgTable(
  'embedding_collections',
  {
    uuid: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar(),
    cmetadata: jsonb(),
  },
  (table) => [
    index('idx_embedding_collections_name').using(
      'btree',
      table.name.asc().nullsLast().op('text_ops'),
    ),
  ],
);

export const embeddingDocuments = pgTable(
  'embedding_documents',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    content: text(),
    metadata: jsonb(),
    vector: vector({ dimensions: 3072 }),
    collectionId: uuid('collection_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.collectionId],
      foreignColumns: [embeddingCollections.uuid],
      name: 'embedding_documents_collection_id_fkey',
    }).onDelete('cascade'),
  ],
);
