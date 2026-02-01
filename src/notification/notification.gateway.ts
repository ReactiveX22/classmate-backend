import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { Server } from 'socket.io';
import { User } from 'src/auth/auth.factory';
import { ClassroomService } from 'src/classroom/services/classroom.service';
import { AppRole } from 'src/common/enums/role.enum';
import { type AuthenticatedSocket } from 'src/common/types/socket.types';
import { AppNotification } from 'src/database/schema';

@WebSocketGateway()
export class NotificationGateway implements OnGatewayConnection {
  constructor(
    private readonly authService: AuthService,
    private readonly classroomService: ClassroomService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const session = await this.authService.api.getSession({
        headers: client.handshake.headers as HeadersInit,
      });

      if (!session) {
        console.log('Unauthorized: No session found. Disconnecting...');
        client.disconnect();
        return;
      }

      client.data.user = session.user as User;

      await this.joinRooms(client);

      console.log(`Connected: ${session.user.email}`);
    } catch (error) {
      console.error('WebSocket Auth Error:', error);
      client.disconnect();
    }
  }

  async sendNotificationToClassroom(
    classroomId: string,
    notification: AppNotification,
  ) {
    this.server.to(`class_${classroomId}`).emit('notification', notification);
  }

  async sendNotificationToOrganization(
    organizationId: string,
    notification: AppNotification,
  ) {
    this.server.to(`org_${organizationId}`).emit('notification', notification);
  }

  private async joinRooms(client: AuthenticatedSocket) {
    const user = client.data.user;

    if (user.role === AppRole.Instructor || user.role === AppRole.Student) {
      const classrooms = await this.classroomService.findUserClassroomIds(
        user.id,
      );

      classrooms.forEach((classroomId) => {
        client.join(`class_${classroomId}`);
      });
    }

    client.join(`org_${user.organizationId}`);

    Logger.log('Client rooms: ', client.rooms);
  }
}
