import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import {
  CACHE_INVALIDATE_METADATA,
  CACHE_RESOURCE_METADATA,
} from './cache.constants';
import { CacheService } from './cache.service';
import { TenantCacheInterceptor } from './interceptors/tenant-cache.interceptor';

describe('TenantCacheInterceptor (Integration)', () => {
  let interceptor: TenantCacheInterceptor;
  let cacheService: CacheService;
  let eventEmitter: EventEmitter2;
  let reflector: Reflector;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    stores: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantCacheInterceptor,
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        Reflector,
        EventEmitter2,
      ],
    }).compile();

    interceptor = module.get<TenantCacheInterceptor>(TenantCacheInterceptor);
    cacheService = module.get<CacheService>(CacheService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should return cached data if present', async () => {
      const mockRequest = {
        method: 'GET',
        organizationId: 'org-1',
        query: { page: '1' },
      };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === CACHE_RESOURCE_METADATA) return 'courses';
        return undefined;
      });

      mockCacheManager.get.mockResolvedValue({ data: 'cached' });

      const next = {
        handle: () => of({ data: 'fresh' }),
      };

      const result$ = await interceptor.intercept(mockContext, next as any);
      const result = await result$.toPromise();

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'cache:org-1:courses:page=1',
      );
      expect(result).toEqual({ data: 'cached' });
    });

    it('should cache fresh data on miss', async () => {
      const mockRequest = {
        method: 'GET',
        organizationId: 'org-1',
        query: {},
      };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === CACHE_RESOURCE_METADATA) return 'courses';
        return undefined;
      });

      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.set.mockResolvedValue(undefined);

      const next = {
        handle: () => of({ data: 'fresh' }),
      };

      const result$ = await interceptor.intercept(mockContext, next as any);
      const result = await result$.toPromise();

      expect(mockCacheManager.get).toHaveBeenCalledWith('cache:org-1:courses');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'cache:org-1:courses',
        { data: 'fresh' },
        undefined,
      );
      expect(result).toEqual({ data: 'fresh' });
    });
  });

  describe('Mutations', () => {
    it('should emit invalidation event on successful mutation', async () => {
      const mockRequest = {
        method: 'POST',
        organizationId: 'org-1',
      };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === CACHE_INVALIDATE_METADATA) return ['courses'];
        return undefined;
      });

      jest.spyOn(eventEmitter, 'emit');

      const next = {
        handle: () => of({ success: true }),
      };

      const result$ = await interceptor.intercept(mockContext, next as any);
      await result$.toPromise();

      expect(eventEmitter.emit).toHaveBeenCalledWith('cache.invalidate', {
        organizationId: 'org-1',
        resources: ['courses'],
      });
    });
  });
});

describe('CacheService Invalidation', () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register({ ttl: 60_000 })],
      providers: [CacheService],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
  });

  it('should invalidate only matching keys by prefix', async () => {
    // Seed cache with multiple keys
    await cacheService.set('cache:org-1:teachers', { page: 'default' });
    await cacheService.set('cache:org-1:teachers:page=1', { page: 1 });
    await cacheService.set('cache:org-1:teachers:page=2', { page: 2 });
    await cacheService.set('cache:org-1:courses:page=1', { page: 1 });

    // Verify all values are cached
    expect(await cacheService.get('cache:org-1:teachers')).toEqual({
      page: 'default',
    });
    expect(await cacheService.get('cache:org-1:teachers:page=1')).toEqual({
      page: 1,
    });
    expect(await cacheService.get('cache:org-1:courses:page=1')).toEqual({
      page: 1,
    });

    // Invalidate teachers
    await cacheService.invalidateByPattern('org-1', 'teachers');

    // Teachers keys should be gone
    expect(await cacheService.get('cache:org-1:teachers')).toBeUndefined();
    expect(
      await cacheService.get('cache:org-1:teachers:page=1'),
    ).toBeUndefined();
    expect(
      await cacheService.get('cache:org-1:teachers:page=2'),
    ).toBeUndefined();

    // Courses key should remain
    expect(await cacheService.get('cache:org-1:courses:page=1')).toEqual({
      page: 1,
    });
  });

  it('should not fail when no keys match', async () => {
    await cacheService.set('cache:org-1:courses:page=1', { page: 1 });

    // Invalidate a resource with no matching keys
    await expect(
      cacheService.invalidateByPattern('org-1', 'teachers'),
    ).resolves.toBeUndefined();

    // Unrelated key should remain
    expect(await cacheService.get('cache:org-1:courses:page=1')).toEqual({
      page: 1,
    });
  });

  it('should not cross-invalidate between organizations', async () => {
    await cacheService.set('cache:org-1:teachers:page=1', { org1: true });
    await cacheService.set('cache:org-2:teachers:page=1', { org2: true });

    // Invalidate only org-1 teachers
    await cacheService.invalidateByPattern('org-1', 'teachers');

    expect(
      await cacheService.get('cache:org-1:teachers:page=1'),
    ).toBeUndefined();
    expect(await cacheService.get('cache:org-2:teachers:page=1')).toEqual({
      org2: true,
    });
  });
});
