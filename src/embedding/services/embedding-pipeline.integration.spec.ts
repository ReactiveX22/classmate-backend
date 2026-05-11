import { Test, TestingModule } from '@nestjs/testing';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AttachmentSourceService } from './attachment-source.service';
import { ChunkingService } from './chunking.service';
import { DocumentLoaderService } from './document-loader.service';
import type { Attachment } from '../../database/schema/types';

describe('Embedding Pipeline (Integration)', () => {
  let loaderService: DocumentLoaderService;
  let chunkingService: ChunkingService;
  let attachmentSourceService: AttachmentSourceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentLoaderService,
        ChunkingService,
        {
          provide: AttachmentSourceService,
          useValue: {
            getFileBuffer: vi.fn(),
          },
        },
      ],
    }).compile();

    loaderService = module.get<DocumentLoaderService>(DocumentLoaderService);
    chunkingService = module.get<ChunkingService>(ChunkingService);
    attachmentSourceService = module.get<AttachmentSourceService>(
      AttachmentSourceService,
    );
  });

  it('should load and chunk the test PDF', async () => {
    // 1. Setup the test file
    const pdfPath = join(process.cwd(), 'test/assets/embedding/test.pdf');
    const pdfBuffer = readFileSync(pdfPath);

    const mockAttachment: Attachment = {
      id: 'test-attachment-id',
      name: 'test.pdf',
      url: '/api/v1/uploads/attachments/test.pdf',
      type: 'file',
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
    };

    // 2. Mock the source service to return the real file buffer
    vi.spyOn(attachmentSourceService, 'getFileBuffer').mockResolvedValue(
      pdfBuffer,
    );

    // 3. Load the document
    const documents = await loaderService.loadDocument(mockAttachment);
    expect(documents.length).toBeGreaterThan(0);
    expect(documents[0].pageContent).toBeTruthy();

    // 4. Chunk the documents
    const chunks = await chunkingService.chunkDocuments(documents);

    // 5. Assertions
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].text).toBeTruthy();
    expect(chunks[0].metadata.chunkIndex).toBe(0);
    expect(chunks[0].metadata.attachmentId).toBeUndefined(); // Loader doesn't add this yet, it's added in the processor usually

    console.log(`Successfully split test.pdf into ${chunks.length} chunks.`);
  });
});
