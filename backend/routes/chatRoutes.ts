import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    listConversations,
    getMessages,
    sendMessage,
    markRead,
    createOrGetConversation
} from '../controller/chatController';

const chatRouter = Router();

// List conversations for signed-in user
chatRouter.get('/conversations', protect, listConversations);

// Create or get an existing conversation
chatRouter.post('/conversations', protect, createOrGetConversation);

// Get paginated messages for a conversation
chatRouter.get('/conversations/:conversationId/messages', protect, getMessages);

// Send a message (REST fallback — prefer Socket.IO)
chatRouter.post('/conversations/:conversationId/messages', protect, sendMessage);

// Mark all messages in a conversation as read
chatRouter.put('/conversations/:conversationId/read', protect, markRead);

export default chatRouter;
