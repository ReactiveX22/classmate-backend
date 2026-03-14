import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly trackedKeys = new Set<string>();

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
    this.trackedKeys.add(key);
  }

  /**
   * Delete a single key
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
    this.trackedKeys.delete(key);
  }

  /**
   * Invalidate all cached keys matching cache:{orgId}:{resource}:*
   * Also matches the exact key cache:{orgId}:{resource} (no trailing params).
   */
  async invalidateByPattern(orgId: string, resource: string): Promise<void> {
    const prefix = `cache:${orgId}:${resource}`;
    this.logger.log(`Invalidating cache keys with prefix: ${prefix}`);

    const keysToDelete = [...this.trackedKeys].filter(
      (key) => key === prefix || key.startsWith(`${prefix}:`),
    );

    if (keysToDelete.length === 0) {
      this.logger.debug(`No tracked keys matched prefix: ${prefix}`);
      return;
    }

    this.logger.debug(
      `Deleting ${keysToDelete.length} cached key(s): ${keysToDelete.join(', ')}`,
    );

    await Promise.all(
      keysToDelete.map(async (key) => {
        await this.cacheManager.del(key);
        this.trackedKeys.delete(key);
      }),
    );
  }
}
