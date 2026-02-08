import { Test, TestingModule } from '@nestjs/testing';
import { STORAGE_STRATEGY } from './interfaces/storage-strategy.interface';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let mockStrategy: any;

  beforeEach(async () => {
    mockStrategy = {
      uploadFile: jest.fn(),
      uploadFiles: jest.fn(),
      deleteFile: jest.fn(),
      deleteFiles: jest.fn(),
      deleteDirectory: jest.fn(),
      getFileUrl: jest.fn(),
      fileExists: jest.fn(),
      serveFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: STORAGE_STRATEGY,
          useValue: mockStrategy,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should delegate to strategy', async () => {
      const mockFile = { originalname: 'test.txt' } as Express.Multer.File;
      const mockResult = {
        id: '123',
        name: 'test.txt',
        url: 'http://test.com/test.txt',
      };
      mockStrategy.uploadFile.mockResolvedValue(mockResult);

      const result = await service.uploadFile(mockFile, 'test-folder');

      expect(mockStrategy.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'test-folder',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('uploadFiles', () => {
    it('should delegate to strategy', async () => {
      const mockFiles = [{ originalname: 'test.txt' }] as Express.Multer.File[];
      const mockResults = [
        { id: '123', name: 'test.txt', url: 'http://test.com/test.txt' },
      ];
      mockStrategy.uploadFiles.mockResolvedValue(mockResults);

      const result = await service.uploadFiles(mockFiles, 'test-folder');

      expect(mockStrategy.uploadFiles).toHaveBeenCalledWith(
        mockFiles,
        'test-folder',
      );
      expect(result).toEqual(mockResults);
    });
  });

  describe('deleteFile', () => {
    it('should delegate to strategy', async () => {
      await service.deleteFile('test/path.txt');

      expect(mockStrategy.deleteFile).toHaveBeenCalledWith('test/path.txt');
    });
  });

  describe('deleteFiles', () => {
    it('should delegate to strategy', async () => {
      await service.deleteFiles('test-folder', ['id1', 'id2']);

      expect(mockStrategy.deleteFiles).toHaveBeenCalledWith('test-folder', [
        'id1',
        'id2',
      ]);
    });
  });

  describe('deleteDirectory', () => {
    it('should delegate to strategy', async () => {
      await service.deleteDirectory('test-folder');

      expect(mockStrategy.deleteDirectory).toHaveBeenCalledWith('test-folder');
    });
  });

  describe('getFileUrl', () => {
    it('should delegate to strategy', () => {
      mockStrategy.getFileUrl.mockReturnValue(
        'http://test.com/folder/file.txt',
      );

      const result = service.getFileUrl('folder', 'file.txt');

      expect(mockStrategy.getFileUrl).toHaveBeenCalledWith(
        'folder',
        'file.txt',
      );
      expect(result).toBe('http://test.com/folder/file.txt');
    });
  });

  describe('fileExists', () => {
    it('should delegate to strategy', async () => {
      mockStrategy.fileExists.mockResolvedValue(true);

      const result = await service.fileExists('folder', 'file.txt');

      expect(mockStrategy.fileExists).toHaveBeenCalledWith(
        'folder',
        'file.txt',
      );
      expect(result).toBe(true);
    });
  });

  describe('serveFile', () => {
    it('should delegate to strategy', async () => {
      const mockRes = {} as any;
      mockStrategy.serveFile.mockResolvedValue(undefined);

      await service.serveFile('folder', 'file.txt', mockRes);

      expect(mockStrategy.serveFile).toHaveBeenCalledWith(
        'folder',
        'file.txt',
        mockRes,
      );
    });
  });
});
