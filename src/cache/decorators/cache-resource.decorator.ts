import { SetMetadata } from '@nestjs/common';
import {
  CACHE_RESOURCE_METADATA,
  CACHE_TTL_METADATA,
} from '../cache.constants';

export interface CacheOptions {
  ttl?: number;
}

export const CacheResource = (resource: string, options?: CacheOptions) => {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    SetMetadata(CACHE_RESOURCE_METADATA, resource)(target, key, descriptor);
    if (options?.ttl) {
      SetMetadata(CACHE_TTL_METADATA, options.ttl)(target, key, descriptor);
    }
  };
};
