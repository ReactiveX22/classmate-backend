import * as crypto from 'crypto';

export function computeSourceHash(data: {
  attachmentId: string;
  text: string;
  mimeType: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingProvider: string;
  embeddingModel: string;
}): string {
  const hash = crypto.createHash('sha256');
  hash.update(data.attachmentId);
  hash.update(data.text);
  hash.update(data.mimeType);
  hash.update(data.chunkSize.toString());
  hash.update(data.chunkOverlap.toString());
  hash.update(data.embeddingProvider);
  hash.update(data.embeddingModel);
  return hash.digest('hex');
}
