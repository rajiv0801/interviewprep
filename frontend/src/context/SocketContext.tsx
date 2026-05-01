import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    unreadNotifications: number;
    unreadMessages: number;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    unreadNotifications: 0,
    unreadMessages: 0
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const socketRef = useRef<Socket | null>(null);

    const connect = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Prevent duplicate connections
        if (socketRef.current?.connected) return;

        const newSocket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000
        });

        newSocket.on('connect', () => {
            console.log('🔌 Socket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
            console.error('🔌 Socket connection error:', err.message);
            setIsConnected(false);
            
            // If the socket server rejected our token, log the user out to stop retry loops
            if (err.message.toLowerCase().includes('token')) {
                newSocket.disconnect();
                localStorage.removeItem('token');
                window.dispatchEvent(new Event('authChange'));
            }
        });

        // Notification events
        newSocket.on('unread_count', (data: { count: number }) => {
            setUnreadNotifications(data.count);
        });

        newSocket.on('new_notification', () => {
            setUnreadNotifications(prev => prev + 1);
        });

        newSocket.on('all_notifications_read', () => {
            setUnreadNotifications(0);
        });

        // Message notification events
        newSocket.on('message_notification', () => {
            setUnreadMessages(prev => prev + 1);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
        }
    }, []);

    // Connect when token exists, disconnect when removed
    useEffect(() => {
        // Prevent synchronous state update in the effect body to suppress cascading render warning
        const initConnection = setTimeout(() => {
            const token = localStorage.getItem('token');
            if (token) {
                connect();
            }
        }, 0);

        const handleAuthChange = () => {
            const t = localStorage.getItem('token');
            if (t) {
                // Ensure it's not strictly synchronous to avoid cascade rules
                setTimeout(() => connect(), 0);
            } else {
                setTimeout(() => disconnect(), 0);
            }
        };

        window.addEventListener('authChange', handleAuthChange);
        window.addEventListener('storage', handleAuthChange);

        return () => {
            clearTimeout(initConnection);
            window.removeEventListener('authChange', handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
            disconnect();
        };
    }, [connect, disconnect]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, unreadNotifications, unreadMessages }}>
            {children}
        </SocketContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);
export default SocketContext;
