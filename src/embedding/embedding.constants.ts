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
  embeddingDimensions: 3072,
} as const;

export const EMBEDDING_QUEUE_NAME = 'embedding';

export type EmbedAttachmentJobReason =
  | 'created'
  | 'updated'
  | 'backfill'
  | 'retry';

export const EMBEDDING_EVENTS = {
  CLASSROOM_POST_ATTACHMENTS_CHANGED:
    'embedding.classroom_post.attachments_changed',
  CLASSROOM_POST_DELETED: 'embedding.classroom_post.deleted',
  CLASSROOM_ATTACHMENT_DELETED: 'embedding.classroom_post.attachment_deleted',
  NOTICE_ATTACHMENTS_CHANGED: 'embedding.notice.attachments_changed',
  NOTICE_DELETED: 'embedding.notice.deleted',
  NOTICE_ATTACHMENT_DELETED: 'embedding.notice.attachment_deleted',
} as const;

export interface ClassroomAttachmentDeletedEvent {
  organizationId: string;
  classroomId: string;
  postId: string;
  attachmentId: string;
}

export interface ClassroomPostAttachmentsChangedEvent {
  organizationId: string;
  classroomId: string;
  postId: string;
  attachmentIds: string[];
  userId: string;
}

export interface ClassroomPostDeletedEvent {
  organizationId: string;
  classroomId: string;
  postId: string;
}

export interface NoticeAttachmentDeletedEventPayload {
  organizationId: string;
  noticeId: string;
  attachmentId: string;
}

export interface NoticeAttachmentsChangedEventPayload {
  organizationId: string;
  noticeId: string;
  attachmentIds: string[];
  userId: string;
}

export interface NoticeDeletedEventPayload {
  organizationId: string;
  noticeId: string;
}
