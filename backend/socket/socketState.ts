import { Server } from 'socket.io';

/**
 * Shared Socket.IO state.
 * Extracted to break circular dependency between index.ts and handler files.
 */

let io: Server;

// Track online users: userId → Set<socketId>
export const onlineUsers = new Map<string, Set<string>>();

/**
 * Set the Socket.IO server instance (called once from index.ts).
 */
export const setIO = (server: Server): void => {
    io = server;
};

/**
 * Get the Socket.IO server instance.
 */
export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.IO not initialised. Call initSocketIO() first.');
    }
    return io;
};

/**
 * Check if a user is currently connected.
 */
export const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
};

/**
 * Emit an event to a specific user (across all their connected devices).
 */
export const emitToUser = (userId: string, event: string, data: unknown): void => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};
