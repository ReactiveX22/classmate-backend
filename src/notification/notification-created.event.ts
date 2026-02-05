import { EVENTS } from 'src/common/constants/events';
import { type InsertNotification } from 'src/database/schema';

export class NotificationCreatedEvent {
  static readonly signature = EVENTS.NOTIFICATION.CREATED;

  public readonly payload: InsertNotification & {
    recipientEmail?: string;
    recipientName?: string;
    actor?: {
      id: string;
      name: string;
      image: string | null;
    };
  };

  constructor(
    data: InsertNotification & {
      recipientEmail?: string;
      recipientName?: string;
      actor?: {
        id: string;
        name: string;
        image: string | null;
      };
    },
  ) {
    this.payload = data;
  }
}
