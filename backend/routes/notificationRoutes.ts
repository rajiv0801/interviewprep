import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllRead,
    deleteNotification
} from '../controller/notificationController';

const notificationRouter = Router();

// List notifications (with optional ?unread=true filter)
notificationRouter.get('/', protect, getNotifications);

// Get unread count (lightweight polling endpoint)
notificationRouter.get('/unread-count', protect, getUnreadCount);

// Mark all notifications as read
notificationRouter.put('/read-all', protect, markAllRead);

// Mark a single notification as read
notificationRouter.put('/:id/read', protect, markNotificationRead);

// Delete a notification
notificationRouter.delete('/:id', protect, deleteNotification);

export default notificationRouter;
