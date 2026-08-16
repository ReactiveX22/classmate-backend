import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type Redis from 'ioredis';

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorageRedisService['increment']>
>;

export class ResilientThrottlerStorage extends ThrottlerStorageRedisService {
  constructor(client: Redis) {
    super(client);
  }

  override async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      return await super.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    } catch {
      // Redis is unavailable: fail open instead of erroring every request.
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
