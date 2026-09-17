import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const session = req.session as { user?: { id?: string } } | undefined;
    const userId = session?.user?.id;
    if (userId) {
      return Promise.resolve(`user:${userId}`);
    }

    return Promise.resolve(req.ip as string);
  }
}
