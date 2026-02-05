export type Attachment = {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link' | 'video' | 'image';
  size?: number;
  mimeType?: string;
};
