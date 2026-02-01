import { Socket } from 'socket.io';
import { User } from 'src/auth/auth.factory';

export interface SocketData {
  user: User;
}

export type AuthenticatedSocket = Socket<any, any, any, SocketData>;
