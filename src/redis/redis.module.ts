import {
  Global,
  Inject,
  Logger,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export function createRedisClient(url: string, name: string): Redis {
  const logger = new Logger(`Redis(${name})`);
  let warned = false;

  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 5000,
    keepAlive: 5000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  client.on('error', (error: Error) => {
    if (!warned) {
      warned = true;
      logger.warn(`Redis unavailable: ${error.message}`);
    }
  });

  client.on('ready', () => {
    warned = false;
    logger.log('Redis connection ready');
  });

  client.connect().catch(() => undefined);

  return client;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis | null => {
        const url = config.get<string>('THROTTLER_REDIS_URL');
        return url ? createRedisClient(url, 'throttler') : null;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis | null) {}

  onModuleDestroy(): void {
    this.client?.disconnect();
  }
}
