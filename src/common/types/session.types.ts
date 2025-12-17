import { Session, User } from 'src/auth/auth.factory';

export interface AppUserSession {
  session: Session;
  user: User;
}
