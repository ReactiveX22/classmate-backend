import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CACHE_INVALIDATE_EVENT,
  type CacheInvalidatePayload,
} from '../cache.constants';
import { CacheService } from '../cache.service';

@Injectable()
export class CacheInvalidationListener {
  private readonly logger = new Logger(CacheInvalidationListener.name);

  constructor(private readonly cacheService: CacheService) {}

  @OnEvent(CACHE_INVALIDATE_EVENT, { async: true })
  async handleCacheInvalidateEvent(payload: CacheInvalidatePayload) {
    const { organizationId, resources } = payload;

    this.logger.debug(
      `Received invalidation event for resources: ${resources} in org ${organizationId}`,
    );

    try {
      await Promise.all(
        resources.map((resource) =>
          this.cacheService.invalidateByPattern(organizationId, resource),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle cache invalidation for resources ${resources} in org ${organizationId}`,
        error,
      );
    }
  }
}
