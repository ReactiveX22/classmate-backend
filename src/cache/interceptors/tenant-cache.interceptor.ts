import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  CACHE_INVALIDATE_EVENT,
  CACHE_INVALIDATE_METADATA,
  CACHE_RESOURCE_METADATA,
  CACHE_TTL_METADATA,
  CacheInvalidatePayload,
} from '../cache.constants';
import { CacheService } from '../cache.service';

@Injectable()
export class TenantCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantCacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // 1. Get metadata
    const resource = this.reflector.get<string>(
      CACHE_RESOURCE_METADATA,
      context.getHandler(),
    );
    const invalidateResources = this.reflector.get<string[]>(
      CACHE_INVALIDATE_METADATA,
      context.getHandler(),
    );

    // If no caching metadata, proceed
    if (!resource && !invalidateResources) {
      return next.handle();
    }

    const orgId =
      request.organizationId || request.session?.user?.organizationId;

    if (!orgId) {
      this.logger.debug(
        'No organizationId found in request, skipping cache interceptor logic',
      );
      return next.handle();
    }

    // 2. Handle GET (Caching)
    if (method === 'GET' && resource) {
      const cacheKey = this.buildCacheKey(orgId, resource, request);
      const cachedData = await this.cacheService.get(cacheKey);

      if (cachedData) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return of(cachedData);
      }

      this.logger.debug(`Cache miss: ${cacheKey}`);
      const ttl = this.reflector.get<number>(
        CACHE_TTL_METADATA,
        context.getHandler(),
      );

      return next.handle().pipe(
        tap(async (data) => {
          if (data) {
            await this.cacheService.set(cacheKey, data, ttl);
          }
        }),
      );
    }

    // 3. Handle Mutations (Invalidation)
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) &&
      invalidateResources
    ) {
      return next.handle().pipe(
        tap(() => {
          this.logger.debug(
            `Triggering invalidation for ${invalidateResources} in org ${orgId}`,
          );
          const payload: CacheInvalidatePayload = {
            organizationId: orgId,
            resources: invalidateResources,
          };
          this.eventEmitter.emit(CACHE_INVALIDATE_EVENT, payload);
        }),
      );
    }

    return next.handle();
  }

  /**
   * Builds a deterministic cache key
   * Format: cache:{orgId}:{resource}:{serializedParams}:{serializedQuery}
   */
  private buildCacheKey(orgId: string, resource: string, request: any): string {
    const query = request.query || {};
    const params = request.params || {};

    const sortedParamsString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const sortedQueryString = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    const parts = [`cache:${orgId}:${resource}`, request.path];
    if (sortedParamsString) parts.push(sortedParamsString);
    if (sortedQueryString) parts.push(sortedQueryString);

    return parts.join(':');
  }
}
