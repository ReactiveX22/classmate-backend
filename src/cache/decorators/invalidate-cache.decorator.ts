import { SetMetadata } from '@nestjs/common';
import { CACHE_INVALIDATE_METADATA } from '../cache.constants';

export const InvalidateCache = (resources: string | string[]) => {
  const resourceList = Array.isArray(resources) ? resources : [resources];
  return SetMetadata(CACHE_INVALIDATE_METADATA, resourceList);
};
