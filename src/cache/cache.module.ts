import { CacheModule } from '@nestjs/cache-manager';
import { type DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { TenantCacheInterceptor } from './interceptors/tenant-cache.interceptor';
import { CacheInvalidationListener } from './listeners/cache-invalidation.listener';

@Module({})
export class AppCacheModule {
  static register(): DynamicModule {
    return {
      module: AppCacheModule,
      global: true,
      imports: [
        CacheModule.registerAsync({
          isGlobal: true,
          imports: [ConfigModule],
          useFactory: async (config: ConfigService) => {
            const store = config.get<string>('CACHE_STORE', 'null');

            if (store === 'null') {
              return { ttl: 0, max: 0 };
            }

            if (store === 'redis') {
              const { redisInsStore } = await import('cache-manager-redis-yet');
              const { createClient } = await import('redis');

              const url = config.get<string>('CACHE_REDIS_URL');
              const client = createClient({
                url,
                pingInterval: 30000,
                disableOfflineQueue: true,
                socket: {
                  connectTimeout: 5000,
                  reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
                },
              }) as Parameters<typeof redisInsStore>[0];

              client.on('error', (error: Error) => {
                Logger.warn(
                  `Redis cache unavailable: ${error.message}`,
                  AppCacheModule.name,
                );
              });
              client.connect().catch(() => undefined);

              return {
                store: redisInsStore(client, {}),
                ttl: config.get<number>('CACHE_TTL', 30) * 1000,
              };
            }

            // Default: in-memory
            return {
              ttl: config.get<number>('CACHE_TTL', 30) * 1000,
              max: config.get<number>('CACHE_MAX_ITEMS', 100),
            };
          },
          inject: [ConfigService],
        }),
      ],
      providers: [
        CacheService,
        TenantCacheInterceptor,
        CacheInvalidationListener,
      ],
      exports: [CacheModule, CacheService, TenantCacheInterceptor],
    };
  }
}
