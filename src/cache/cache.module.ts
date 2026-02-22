import { CacheModule } from '@nestjs/cache-manager';
import { type DynamicModule, Module } from '@nestjs/common';
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
              const { redisStore } = await import('cache-manager-redis-yet');
              return {
                store: redisStore,
                url: config.get<string>('CACHE_REDIS_URL'),
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
