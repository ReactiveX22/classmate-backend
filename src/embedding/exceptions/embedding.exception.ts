export class EmbeddingException extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnsupportedDocumentLoaderException extends EmbeddingException {
  constructor(public readonly mimeType: string) {
    super(
      `Unsupported document loader for MIME type: ${mimeType}`,
      'UNSUPPORTED_DOCUMENT_LOADER',
    );
  }
}

export class EmbeddingModelException extends EmbeddingException {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message, 'EMBEDDING_MODEL_ERROR');
  }
}

export class EmbeddingConfigurationException extends EmbeddingException {
  constructor(message: string) {
    super(message, 'EMBEDDING_CONFIG_ERROR');
  }
}
