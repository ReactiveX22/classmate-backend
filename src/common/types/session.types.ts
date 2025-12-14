import { auth } from 'src/auth/auth-schema-gen';

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

export interface AppUserSession {
  session: Session;
  user: User;
}
