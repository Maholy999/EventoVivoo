import { INotificationRepository, DbNotification } from '@/repositories/INotificationRepository';

export class NotificationService {
  constructor(private notificationRepo: INotificationRepository) {}

  async getUserNotifications(userId: string): Promise<DbNotification[]> {
    return this.notificationRepo.findByUser(userId);
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    return this.notificationRepo.markAsRead(notificationId, userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.getUnreadCount(userId);
  }
}
