import { EmbedAttachmentJobReason } from '../embedding.constants';

export interface EmbedAttachmentJob {
  resourceType: 'classroom_post_attachment' | 'notice_attachment';
  organizationId: string;
  classroomId?: string;
  postId?: string;
  noticeId?: string;
  attachmentId: string;
  requestedByUserId?: string;
  reason: EmbedAttachmentJobReason;
}
