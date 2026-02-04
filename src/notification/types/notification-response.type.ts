import { AppNotification } from 'src/database/schema';

export interface NotificationResponse {
  notification: AppNotification;
  actor: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  readAt: Date | string | null;
  isRead: boolean;
}
