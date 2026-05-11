import { Request } from 'express';
import { Session, User } from 'src/auth/auth.factory';

export interface AuthenticatedRequest extends Request {
  organizationId?: string;
  session?: Session & {
    user: User;
  };
}
