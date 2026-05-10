export const EMBEDDING_DEFAULTS = {
  batchSize: 16,
  chunkSize: 1200,
  chunkOverlap: 200,
  maxFileBytes: 10_000_000,
  maxChunksPerAttachment: 80,
  queueConcurrency: 3,
  vectorTableName: 'embedding_documents',
  vectorCollectionTableName: 'embedding_collections',
  vectorCollectionName: 'classroom_post_attachments',
} as const;

export const EMBEDDING_EVENTS = {
  CLASSROOM_POST_ATTACHMENTS_CHANGED:
    'embedding.classroom_post.attachments_changed',
  CLASSROOM_POST_DELETED: 'embedding.classroom_post.deleted',
} as const;
