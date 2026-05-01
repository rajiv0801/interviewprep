import Notification from '../models/notification';
import { emitToUser, isUserOnline } from '../socket/socketState';

interface CreateNotificationOptions {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    actionUrl?: string;
}

/**
 * Centralised notification service.
 * Creates a DB record and pushes a real-time event via Socket.IO.
 * Can be called from any controller, service, or socket handler.
 */
class NotificationService {

    /**
     * Create a notification and deliver it in real-time if user is online.
     */
    async create(options: CreateNotificationOptions): Promise<void> {
        try {
            const notification = await Notification.create({
                user: options.userId,
                type: options.type,
                title: options.title,
                message: options.message,
                data: options.data,
                actionUrl: options.actionUrl
            });

            // Push via Socket.IO if user is connected
            try {
                emitToUser(options.userId, 'new_notification', {
                    notification
                });

                // Also update unread count
                const unreadCount = await Notification.countDocuments({
                    user: options.userId,
                    isRead: false
                });
                emitToUser(options.userId, 'unread_count', { count: unreadCount });
            } catch {
                // Socket.IO might not be initialised (e.g. during tests) — skip silently
            }
        } catch (err) {
            console.error('[NotificationService] Failed to create notification:', err);
        }
    }

    /**
     * Create notifications for multiple users at once.
     */
    async createBulk(
        userIds: string[],
        type: string,
        title: string,
        message: string,
        data?: Record<string, unknown>,
        actionUrl?: string
    ): Promise<void> {
        const promises = userIds.map(userId =>
            this.create({ userId, type, title, message, data, actionUrl })
        );
        await Promise.allSettled(promises);
    }

    /**
     * Get unread notification count for a user.
     */
    async getUnreadCount(userId: string): Promise<number> {
        return Notification.countDocuments({ user: userId, isRead: false });
    }

    /**
     * Mark a notification as read.
     */
    async markRead(notificationId: string, userId: string): Promise<boolean> {
        const result = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );
        return !!result;
    }

    /**
     * Mark all notifications as read for a user.
     */
    async markAllRead(userId: string): Promise<number> {
        const result = await Notification.updateMany(
            { user: userId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );
        return result.modifiedCount;
    }

    /**
     * Check if a user is currently online.
     */
    isOnline(userId: string): boolean {
        try {
            return isUserOnline(userId);
        } catch {
            return false;
        }
    }
}

const notificationService = new NotificationService();
export default notificationService;
