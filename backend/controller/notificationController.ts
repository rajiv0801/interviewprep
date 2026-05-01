import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import Notification from '../models/notification';

// ==================== HELPERS ====================

const sendSuccess = (res: Response, data: unknown, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res: Response, message: string, statusCode = 400, error?: unknown) => {
    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined
    });
};

// ==================== GET NOTIFICATIONS ====================

/**
 * GET /api/notifications
 * Returns paginated notifications for the authenticated user.
 */
export const getNotifications = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = { user: user._id };
        if (req.query.unread === 'true') {
            filter.isRead = false;
        }

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments(filter),
            Notification.countDocuments({ user: user._id, isRead: false })
        ]);

        sendSuccess(res, {
            notifications,
            unreadCount,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[getNotifications]', error);
        sendError(res, 'Failed to fetch notifications', 500, error);
    }
};

// ==================== GET UNREAD COUNT ====================

/**
 * GET /api/notifications/unread-count
 * Returns just the unread notification count (lightweight endpoint for polling).
 */
export const getUnreadCount = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const count = await Notification.countDocuments({
            user: req.user!._id,
            isRead: false
        });

        sendSuccess(res, { count });
    } catch (error) {
        console.error('[getUnreadCount]', error);
        sendError(res, 'Failed to fetch unread count', 500, error);
    }
};

// ==================== MARK READ ====================

/**
 * PUT /api/notifications/:id/read
 * Marks a single notification as read.
 */
export const markNotificationRead = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user!._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } },
            { new: true }
        );

        if (!notification) {
            sendError(res, 'Notification not found or already read', 404);
            return;
        }

        sendSuccess(res, { notification }, 'Notification marked as read');
    } catch (error) {
        console.error('[markNotificationRead]', error);
        sendError(res, 'Failed to mark notification as read', 500, error);
    }
};

// ==================== MARK ALL READ ====================

/**
 * PUT /api/notifications/read-all
 * Marks all notifications as read for the authenticated user.
 */
export const markAllRead = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const result = await Notification.updateMany(
            { user: req.user!._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );

        sendSuccess(res, { modifiedCount: result.modifiedCount }, 'All notifications marked as read');
    } catch (error) {
        console.error('[markAllRead]', error);
        sendError(res, 'Failed to mark all as read', 500, error);
    }
};

// ==================== DELETE NOTIFICATION ====================

/**
 * DELETE /api/notifications/:id
 * Deletes a single notification.
 */
export const deleteNotification = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const result = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: req.user!._id
        });

        if (!result) {
            sendError(res, 'Notification not found', 404);
            return;
        }

        sendSuccess(res, null, 'Notification deleted');
    } catch (error) {
        console.error('[deleteNotification]', error);
        sendError(res, 'Failed to delete notification', 500, error);
    }
};
