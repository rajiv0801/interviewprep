import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import User from '../models/user';
import { IUser } from '../types/type';

interface JwtPayload {
    id: string;
    iat: number;
    exp: number;
}

// Extend Socket to include our custom data
export interface AuthenticatedSocket extends Socket {
    data: {
        user: IUser;
        userId: string;
    };
}

/**
 * Socket.IO authentication middleware.
 * Extracts JWT from socket handshake auth, verifies it, and attaches user to socket.data.
 */
export const socketAuthMiddleware = async (
    socket: Socket,
    next: (err?: Error) => void
): Promise<void> => {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
            return next(new Error('Authentication required'));
        }

        const secret = process.env.JWT_KEY || 'your-super-secret-jwt-key-change-in-production';
        const decoded = jwt.verify(token, secret) as JwtPayload;

        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return next(new Error('User not found or inactive'));
        }

        // Attach user info to socket instance
        socket.data.user = user;
        socket.data.userId = user._id.toString();

        next();
    } catch (err) {
        console.error('[socketAuth] Authentication failed:', err);
        next(new Error('Invalid or expired token'));
    }
};
