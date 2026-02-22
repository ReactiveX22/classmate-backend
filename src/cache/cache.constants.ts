export const CACHE_RESOURCE_METADATA = 'cache:resource';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_INVALIDATE_METADATA = 'cache:invalidate';

export const CACHE_INVALIDATE_EVENT = 'cache.invalidate';

export interface CacheInvalidatePayload {
  organizationId: string;
  resources: string[];
}
