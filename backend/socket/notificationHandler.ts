import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuth';
import Notification from '../models/notification';

/**
 * Register notification-related socket event handlers.
 */
export const registerNotificationHandlers = (io: Server, socket: AuthenticatedSocket): void => {
    const userId = socket.data.userId;

    // ==================== ON CONNECTION: SEND UNREAD COUNT ====================

    (async () => {
        try {
            const unreadCount = await Notification.countDocuments({
                user: userId,
                isRead: false
            });

            socket.emit('unread_count', { count: unreadCount });
        } catch (err) {
            console.error('[Notification] Failed to send unread count:', err);
        }
    })();

    // ==================== MARK SINGLE NOTIFICATION AS READ ====================

    socket.on('mark_notification_read', async (notificationId: string) => {
        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, user: userId, isRead: false },
                { $set: { isRead: true, readAt: new Date() } },
                { new: true }
            );

            if (notification) {
                const unreadCount = await Notification.countDocuments({
                    user: userId,
                    isRead: false
                });

                socket.emit('notification_marked_read', { notificationId });
                socket.emit('unread_count', { count: unreadCount });
            }
        } catch (err) {
            console.error('[Notification] mark_notification_read error:', err);
        }
    });

    // ==================== MARK ALL NOTIFICATIONS AS READ ====================

    socket.on('mark_all_notifications_read', async () => {
        try {
            await Notification.updateMany(
                { user: userId, isRead: false },
                { $set: { isRead: true, readAt: new Date() } }
            );

            socket.emit('all_notifications_read', {});
            socket.emit('unread_count', { count: 0 });
        } catch (err) {
            console.error('[Notification] mark_all_notifications_read error:', err);
        }
    });

    // ==================== GET RECENT NOTIFICATIONS ====================

    socket.on('get_notifications', async (data?: { page?: number; limit?: number }) => {
        try {
            const page = data?.page || 1;
            const limit = Math.min(data?.limit || 20, 50);
            const skip = (page - 1) * limit;

            const [notifications, total] = await Promise.all([
                Notification.find({ user: userId })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                Notification.countDocuments({ user: userId })
            ]);

            socket.emit('notifications_list', {
                notifications,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (err) {
            console.error('[Notification] get_notifications error:', err);
        }
    });
};
