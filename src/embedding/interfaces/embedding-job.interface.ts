import { EmbedAttachmentJobReason } from '../embedding.constants';

export interface EmbedAttachmentJob {
  organizationId: string;
  classroomId: string;
  postId: string;
  attachmentId: string;
  requestedByUserId?: string;
  reason: EmbedAttachmentJobReason;
}
