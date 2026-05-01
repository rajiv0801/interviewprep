import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from '../middleware/socketAuth';
import { registerChatHandlers } from './chatHandler';
import { registerNotificationHandlers } from './notificationHandler';
import { setIO, onlineUsers } from './socketState';

// Re-export shared utilities so existing imports still work
export { getIO, isUserOnline, emitToUser } from './socketState';

/**
 * Initialise Socket.IO on the HTTP server.
 * Called once from app.ts after server.listen().
 */
export const initSocketIO = (httpServer: HttpServer): Server => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Store the io instance in shared state
    setIO(io);

    // Apply JWT auth middleware on every connection
    io.use(socketAuthMiddleware);

    io.on('connection', (socket: Socket) => {
        const authSocket = socket as AuthenticatedSocket;
        const userId = authSocket.data.userId;

        console.log(`🔌 [Socket] Connected: ${userId} (${socket.id})`);

        // Track online status
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId)!.add(socket.id);

        // Join personal room for targeted events
        socket.join(`user:${userId}`);

        // Register domain-specific handlers
        registerChatHandlers(io, authSocket);
        registerNotificationHandlers(io, authSocket);

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`🔌 [Socket] Disconnected: ${userId} (${reason})`);

            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                }
            }
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`[Socket] Error for ${userId}:`, error);
        });
    });

    console.log('🔌 Socket.IO server initialised');
    return io;
};

export default { initSocketIO };
