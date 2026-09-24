import { SetMetadata } from '@nestjs/common';
import {
  CACHE_RESOURCE_METADATA,
  CACHE_SCOPE_METADATA,
  CACHE_TTL_METADATA,
} from '../cache.constants';

export type CacheScope = 'organization' | 'user';

export interface CacheOptions {
  ttl?: number;
  scope?: CacheScope;
}

export const CacheResource = (resource: string, options?: CacheOptions) => {
  return (
    target: object,
    key?: string | symbol,

    descriptor?: TypedPropertyDescriptor<(...args: never[]) => unknown>,
  ) => {
    if (key !== undefined && descriptor !== undefined) {
      SetMetadata(CACHE_RESOURCE_METADATA, resource)(target, key, descriptor);
      SetMetadata(CACHE_SCOPE_METADATA, options?.scope ?? 'organization')(
        target,
        key,
        descriptor,
      );
      if (options?.ttl) {
        SetMetadata(CACHE_TTL_METADATA, options.ttl)(target, key, descriptor);
      }
    }
  };
};
