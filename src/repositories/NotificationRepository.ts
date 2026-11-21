import { Pool, PoolClient } from 'pg';
import {
  INotificationRepository,
  DbNotification,
  NotificationType,
} from './INotificationRepository';

export class NotificationRepository implements INotificationRepository {
  constructor(private pool: Pool) {}

  private getExecutor(client?: PoolClient) {
    return client || this.pool;
  }

  async create(
    data: {
      user_id: string;
      message: string;
      type: NotificationType;
      session_id?: string | null;
    },
    client?: PoolClient
  ): Promise<DbNotification> {
    const executor = this.getExecutor(client);
    const res = await executor.query<DbNotification>(
      `INSERT INTO notifications (user_id, message, type, session_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.user_id, data.message, data.type, data.session_id || null]
    );
    return res.rows[0];
  }

  async createBatch(
    items: {
      user_id: string;
      message: string;
      type: NotificationType;
      session_id?: string | null;
    }[],
    client?: PoolClient
  ): Promise<DbNotification[]> {
    if (items.length === 0) return [];
    const results: DbNotification[] = [];
    for (const item of items) {
      results.push(await this.create(item, client));
    }
    return results;
  }

  async findByUser(userId: string): Promise<DbNotification[]> {
    const res = await this.pool.query<DbNotification>(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows;
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const res = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    return parseInt(res.rows[0].count, 10);
  }
}
