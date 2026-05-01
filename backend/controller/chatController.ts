import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Conversation, Message } from '../models/message';

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

// ==================== LIST CONVERSATIONS ====================

/**
 * GET /api/chat/conversations
 * Returns conversations for the authenticated user, sorted by last message.
 */
export const listConversations = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
        const skip = (page - 1) * limit;

        const [conversations, total] = await Promise.all([
            Conversation.find({ participants: user._id })
                .populate('participants', 'name avatar')
                .populate('booking', 'bookingId scheduledAt status')
                .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Conversation.countDocuments({ participants: user._id })
        ]);

        sendSuccess(res, {
            conversations,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[listConversations]', error);
        sendError(res, 'Failed to fetch conversations', 500, error);
    }
};

// ==================== GET MESSAGES ====================

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Returns paginated messages for a conversation.
 */
export const getMessages = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { conversationId } = req.params;

        // Verify user is a participant
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: user._id
        });

        if (!conversation) {
            sendError(res, 'Conversation not found or access denied', 404);
            return;
        }

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find({ conversation: conversationId, isDeleted: false })
                .populate('sender', 'name avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Message.countDocuments({ conversation: conversationId, isDeleted: false })
        ]);

        sendSuccess(res, {
            messages: messages.reverse(), // chronological order for display
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[getMessages]', error);
        sendError(res, 'Failed to fetch messages', 500, error);
    }
};

// ==================== SEND MESSAGE (REST FALLBACK) ====================

/**
 * POST /api/chat/conversations/:conversationId/messages
 * REST fallback for sending messages (prefer Socket.IO in real-time).
 */
export const sendMessage = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { conversationId } = req.params;
        const { content, type = 'text', codeBlock, attachment } = req.body;

        // Verify participation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: user._id
        });

        if (!conversation) {
            sendError(res, 'Conversation not found or access denied', 404);
            return;
        }

        // Create message
        const message = await Message.create({
            conversation: conversationId,
            sender: user._id,
            content,
            type,
            codeBlock: type === 'code' ? codeBlock : undefined,
            attachment: type === 'file' || type === 'image' ? attachment : undefined,
            readBy: [{ user: user._id, readAt: new Date() }]
        });

        await message.populate('sender', 'name avatar');

        // Update lastMessage on conversation
        conversation.lastMessage = {
            content: content?.substring(0, 100) || '',
            sender: user._id as unknown as typeof conversation.lastMessage.sender,
            sentAt: new Date()
        };
        await conversation.save();

        // Emit via Socket.IO if available
        try {
            const { getIO } = await import('../socket/index');
            const io = getIO();
            io.to(`chat:${conversationId}`).emit('new_message', { message, conversationId });
        } catch {
            // Socket.IO not initialised — no real-time push
        }

        sendSuccess(res, { message }, 'Message sent', 201);
    } catch (error) {
        console.error('[sendMessage]', error);
        sendError(res, 'Failed to send message', 500, error);
    }
};

// ==================== MARK CONVERSATION AS READ ====================

/**
 * PUT /api/chat/conversations/:conversationId/read
 * Marks all messages in a conversation as read.
 */
export const markRead = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { conversationId } = req.params;

        // Verify participation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: user._id
        });

        if (!conversation) {
            sendError(res, 'Conversation not found', 404);
            return;
        }

        // Mark all messages as read by this user
        await Message.updateMany(
            {
                conversation: conversationId,
                'readBy.user': { $ne: user._id }
            },
            {
                $addToSet: { readBy: { user: user._id, readAt: new Date() } }
            }
        );

        // Reset unread count
        if (conversation.unreadCount) {
            conversation.unreadCount.set(user._id.toString(), 0);
            await conversation.save();
        }

        sendSuccess(res, null, 'Conversation marked as read');
    } catch (error) {
        console.error('[markRead]', error);
        sendError(res, 'Failed to mark as read', 500, error);
    }
};

// ==================== CREATE / GET CONVERSATION ====================

/**
 * POST /api/chat/conversations
 * Creates or fetches an existing direct conversation between two users.
 * Used when a booking is confirmed to set up the mentor-student chat.
 */
export const createOrGetConversation = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { participantId, bookingId, type = 'mentor' } = req.body;

        if (!participantId) {
            sendError(res, 'participantId is required', 400);
            return;
        }

        // Check for existing conversation between these participants
        let conversation = await Conversation.findOne({
            type,
            participants: { $all: [user._id, participantId], $size: 2 }
        }).populate('participants', 'name avatar');

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [user._id, participantId],
                type,
                booking: bookingId || undefined,
                unreadCount: new Map()
            });
            await conversation.populate('participants', 'name avatar');
        }

        sendSuccess(res, { conversation }, conversation.isNew ? 'Conversation created' : 'Conversation found');
    } catch (error) {
        console.error('[createOrGetConversation]', error);
        sendError(res, 'Failed to create or find conversation', 500, error);
    }
};
