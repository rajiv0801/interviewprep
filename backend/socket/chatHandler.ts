import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuth';
import { Conversation, Message } from '../models/message';
import { emitToUser } from './socketState';

/**
 * Register chat-related socket event handlers.
 */
export const registerChatHandlers = (io: Server, socket: AuthenticatedSocket): void => {
    const userId = socket.data.userId;

    // ==================== JOIN CONVERSATION ====================

    socket.on('join_conversation', async (conversationId: string) => {
        try {
            // Verify user is a participant
            const conversation = await Conversation.findOne({
                _id: conversationId,
                participants: userId
            });

            if (!conversation) {
                socket.emit('error', { message: 'Conversation not found or access denied' });
                return;
            }

            socket.join(`chat:${conversationId}`);
            socket.emit('joined_conversation', { conversationId });

            console.log(`[Chat] ${userId} joined conversation ${conversationId}`);
        } catch (err) {
            console.error('[Chat] join_conversation error:', err);
            socket.emit('error', { message: 'Failed to join conversation' });
        }
    });

    // ==================== LEAVE CONVERSATION ====================

    socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`chat:${conversationId}`);
    });

    // ==================== SEND MESSAGE ====================

    socket.on('send_message', async (data: {
        conversationId: string;
        content: string;
        type?: 'text' | 'code' | 'file' | 'image';
        codeBlock?: { language: string; code: string };
        attachment?: { url: string; name: string; size: number; mimeType: string };
    }) => {
        try {
            const { conversationId, content, type = 'text', codeBlock, attachment } = data;

            // Verify participation
            const conversation = await Conversation.findOne({
                _id: conversationId,
                participants: userId
            });

            if (!conversation) {
                socket.emit('error', { message: 'Conversation not found or access denied' });
                return;
            }

            // Create message
            const message = await Message.create({
                conversation: conversationId,
                sender: userId,
                content,
                type,
                codeBlock: type === 'code' ? codeBlock : undefined,
                attachment: type === 'file' || type === 'image' ? attachment : undefined,
                readBy: [{ user: userId, readAt: new Date() }]
            });

            // Populate sender info
            await message.populate('sender', 'name avatar');

            // Update conversation's lastMessage
            conversation.lastMessage = {
                content: type === 'code' ? '📝 Sent a code snippet' :
                    type === 'file' ? `📎 ${attachment?.name || 'File'}` :
                        type === 'image' ? '🖼️ Sent an image' :
                            content.substring(0, 100),
                sender: userId as unknown as typeof conversation.lastMessage.sender,
                sentAt: new Date()
            };

            // Increment unread counts for other participants
            const unreadCount = conversation.unreadCount || new Map<string, number>();
            for (const participantId of conversation.participants) {
                const pid = participantId.toString();
                if (pid !== userId) {
                    unreadCount.set(pid, (unreadCount.get(pid) || 0) + 1);
                }
            }
            conversation.unreadCount = unreadCount;
            await conversation.save();

            // Broadcast to the conversation room
            io.to(`chat:${conversationId}`).emit('new_message', {
                message,
                conversationId
            });

            // Send notification to offline participants
            for (const participantId of conversation.participants) {
                const pid = participantId.toString();
                if (pid !== userId) {
                    emitToUser(pid, 'message_notification', {
                        conversationId,
                        senderName: socket.data.user.name,
                        preview: content.substring(0, 80)
                    });
                }
            }
        } catch (err) {
            console.error('[Chat] send_message error:', err);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // ==================== TYPING INDICATORS ====================

    socket.on('typing_start', (conversationId: string) => {
        socket.to(`chat:${conversationId}`).emit('user_typing', {
            conversationId,
            userId,
            userName: socket.data.user.name
        });
    });

    socket.on('typing_stop', (conversationId: string) => {
        socket.to(`chat:${conversationId}`).emit('user_stopped_typing', {
            conversationId,
            userId
        });
    });

    // ==================== MARK MESSAGES AS READ ====================

    socket.on('mark_read', async (conversationId: string) => {
        try {
            // Mark all unread messages in this conversation as read by this user
            await Message.updateMany(
                {
                    conversation: conversationId,
                    'readBy.user': { $ne: userId }
                },
                {
                    $addToSet: { readBy: { user: userId, readAt: new Date() } }
                }
            );

            // Reset unread count for this user
            await Conversation.findByIdAndUpdate(conversationId, {
                $set: { [`unreadCount.${userId}`]: 0 }
            });

            // Broadcast read receipt
            socket.to(`chat:${conversationId}`).emit('messages_read', {
                conversationId,
                userId,
                readAt: new Date()
            });
        } catch (err) {
            console.error('[Chat] mark_read error:', err);
        }
    });
};
