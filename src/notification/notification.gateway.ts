import {
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { AuthService, Session } from '@thallesp/nestjs-better-auth';
import { Server, Socket } from 'socket.io';
import { type AppUserSession } from 'src/common/types/session.types';

@WebSocketGateway()
export class NotificationGateway implements OnGatewayConnection {
  constructor(private readonly authService: AuthService) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      const session = await this.authService.api.getSession({
        headers: client.handshake.headers as HeadersInit,
      });

      if (!session) {
        console.log('Unauthorized: No session found. Disconnecting...');
        client.disconnect();
        return;
      }

      client.data.user = session.user;
      console.log(`Connected: ${session.user.email}`);
    } catch (error) {
      console.error('WebSocket Auth Error:', error);
      client.disconnect();
    }
  }

  @SubscribeMessage('message')
  onMessage(
    @MessageBody() body: any,
    @Session() session: AppUserSession,
  ): void {
    console.log(`Message from ${session.user.email}:`, body);

    this.server.emit('message', {
      sender: session.user.name,
      content: body,
      timestamp: new Date(),
    });
  }
}
