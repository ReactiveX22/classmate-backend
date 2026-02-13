import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

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
  }

  /**
   * Delete a single key
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Invalidate multiple resources for an organization by pattern.
   * Pattern: cache:{orgId}:{resource}:*
   */
  async invalidateByPattern(orgId: string, resource: string): Promise<void> {
    const pattern = `cache:${orgId}:${resource}:*`;
    this.logger.log(`Invalidating cache pattern: ${pattern}`);

    const store = this.cacheManager.store;

    // 1. Redis Store (SCAN + DEL)
    if ('client' in store || (store as any).name === 'redis') {
      try {
        // cache-manager-redis-yet gives access to the client
        const client = (store as any).client;
        if (client) {
          let cursor = '0';
          do {
            const reply = await client.scan(cursor, {
              MATCH: pattern,
              COUNT: 100,
            });
            cursor = reply.cursor;
            const keys = reply.keys;
            if (keys.length > 0) {
              await client.del(keys);
            }
          } while (cursor !== '0');
          return;
        }
      } catch (error) {
        this.logger.error(
          `Failed to invalidate Redis cache with pattern ${pattern}`,
          error,
        );
      }
    }

    // 2. In-Memory Store
    if ('keys' in store) {
      try {
        const allKeys = await (store as any).keys();
        const matchingKeys = allKeys.filter((key: string) =>
          this.wildcardMatch(pattern, key),
        );

        if (matchingKeys.length > 0) {
          await Promise.all(
            matchingKeys.map((key: string) => this.cacheManager.del(key)),
          );
        }
        return;
      } catch (error) {
        this.logger.error(
          `Failed to invalidate in-memory cache with pattern ${pattern}`,
          error,
        );
      }
    }

    this.logger.warn(
      `Store type does not support pattern invalidation or is 'null' store.`,
    );
  }

  /**
   * Simple wildcard matching for in-memory keys
   */
  private wildcardMatch(pattern: string, key: string): boolean {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
    return regex.test(key);
  }
}
