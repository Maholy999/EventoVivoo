import { PoolClient } from 'pg';

export type NotificationType =
  | 'promotion'
  | 'schedule_change'
  | 'waitlisted'
  | 'session_cancelled';

export interface DbNotification {
  id: string;
  user_id: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: Date;
  session_id: string | null;
}

export interface INotificationRepository {
  create(
    data: {
      user_id: string;
      message: string;
      type: NotificationType;
      session_id?: string | null;
    },
    client?: PoolClient
  ): Promise<DbNotification>;

  createBatch(
    items: {
      user_id: string;
      message: string;
      type: NotificationType;
      session_id?: string | null;
    }[],
    client?: PoolClient
  ): Promise<DbNotification[]>;

  findByUser(userId: string): Promise<DbNotification[]>;
  markAsRead(notificationId: string, userId: string): Promise<boolean>;
  getUnreadCount(userId: string): Promise<number>;
}
