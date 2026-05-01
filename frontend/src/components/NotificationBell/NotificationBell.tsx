import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import './NotificationBell.css';

const API = import.meta.env.VITE_API_URL || '';

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    actionUrl?: string;
    createdAt: string;
}

const NotificationBell: React.FC = () => {
    const navigate = useNavigate();
    const { unreadNotifications, socket } = useSocket();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch notifications when opened
    useEffect(() => {
        if (!open) return;

        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get(`${API}/api/notifications`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { limit: 10 }
                });
                if (data.success) {
                    setNotifications(data.data.notifications);
                }
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [open]);

    // Listen for new notifications
    useEffect(() => {
        if (!socket) return;

        const handler = (data: { notification: Notification }) => {
            setNotifications(prev => [data.notification, ...prev].slice(0, 20));
        };

        socket.on('new_notification', handler);
        return () => { socket.off('new_notification', handler); };
    }, [socket]);

    const handleClick = async (notif: Notification) => {
        // Mark as read
        if (!notif.isRead) {
            try {
                const token = localStorage.getItem('token');
                await axios.put(
                    `${API}/api/notifications/${notif._id}/read`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setNotifications(prev =>
                    prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
                );
            } catch { /* silent */ }
        }

        setOpen(false);
        if (notif.actionUrl) {
            navigate(notif.actionUrl);
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API}/api/notifications/read-all`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch { /* silent */ }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'booking_confirmed': return '✅';
            case 'booking_cancelled': return '❌';
            case 'booking_reminder': return '⏰';
            case 'session_started': return '📹';
            case 'session_completed': return '🎉';
            case 'new_message': return '💬';
            case 'payment_received': return '💰';
            case 'review_received': return '⭐';
            case 'mentor_approved': return '🎊';
            case 'mentor_rejected': return '😔';
            default: return '🔔';
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="notif-bell-container" ref={ref}>
            <button className="notif-bell-btn" onClick={() => setOpen(!open)}>
                🔔
                {unreadNotifications > 0 && (
                    <span className="notif-badge">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="notif-dropdown"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="notif-header">
                            <h3>Notifications</h3>
                            {unreadNotifications > 0 && (
                                <button onClick={markAllRead} className="mark-all-btn">
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="notif-list">
                            {loading ? (
                                <p className="notif-empty">Loading...</p>
                            ) : notifications.length === 0 ? (
                                <p className="notif-empty">No notifications</p>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif._id}
                                        className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                                        onClick={() => handleClick(notif)}
                                    >
                                        <span className="notif-icon">{getIcon(notif.type)}</span>
                                        <div className="notif-content">
                                            <span className="notif-title">{notif.title}</span>
                                            <span className="notif-msg">{notif.message}</span>
                                            <span className="notif-time">{formatTime(notif.createdAt)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
