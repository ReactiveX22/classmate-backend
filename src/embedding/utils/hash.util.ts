import { createHash } from 'node:crypto';

/**
 * Generates a SHA-256 hash of the given string.
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generates a source hash for idempotency checks based on attachment and processing config.
 */
export function generateSourceHash(params: {
  attachmentId: string;
  documentText: string;
  loaderName: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingProvider: string;
  embeddingModel: string;
}): string {
  const payload = JSON.stringify({
    id: params.attachmentId,
    text: sha256(params.documentText), // Hash the text to keep payload small
    loader: params.loaderName,
    config: {
      size: params.chunkSize,
      overlap: params.chunkOverlap,
    },
    ai: {
      provider: params.embeddingProvider,
      model: params.embeddingModel,
    },
  });

  return sha256(payload);
}
