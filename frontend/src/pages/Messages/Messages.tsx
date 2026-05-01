import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { FaPaperPlane, FaCode, FaSearch } from 'react-icons/fa';
import './Messages.css';

const API = import.meta.env.VITE_API_URL || '';

interface Conversation {
    _id: string;
    participants: { _id: string; name: string; avatar?: string }[];
    lastMessage?: { content: string; sentAt: string };
    unreadCount?: Map<string, number> | Record<string, number>;
    type: string;
}

interface Message {
    _id: string;
    content: string;
    type: 'text' | 'code' | 'file' | 'image';
    sender: { _id: string; name: string; avatar?: string };
    codeBlock?: { language: string; code: string };
    readBy: { user: string; readAt: string }[];
    createdAt: string;
}

const Messages: React.FC = () => {
    const { conversationId: urlConvoId } = useParams<{ conversationId: string }>();
    const { socket } = useSocket();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvo, setActiveConvo] = useState<string>(urlConvoId || '');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [typing, setTyping] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const currentUserId = useRef(localStorage.getItem('userId') || '');

    // Fetch conversations
    useEffect(() => {
        const fetchConvos = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get(`${API}/api/chat/conversations`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (data.success) {
                    setConversations(data.data.conversations);
                    if (!activeConvo && data.data.conversations.length > 0) {
                        setActiveConvo(data.data.conversations[0]._id);
                    }
                }
            } catch {
                toast.error('Failed to load conversations');
            } finally {
                setLoading(false);
            }
        };
        fetchConvos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch messages when active conversation changes
    useEffect(() => {
        if (!activeConvo) return;

        const fetchMessages = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get(
                    `${API}/api/chat/conversations/${activeConvo}/messages`,
                    { headers: { Authorization: `Bearer ${token}` }, params: { limit: 50 } }
                );
                if (data.success) {
                    setMessages(data.data.messages);
                }
            } catch {
                toast.error('Failed to load messages');
            }
        };
        fetchMessages();

        // Join socket room
        socket?.emit('join_conversation', activeConvo);
        socket?.emit('mark_read', activeConvo);

        return () => {
            socket?.emit('leave_conversation', activeConvo);
        };
    }, [activeConvo, socket]);

    // Socket events
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (data: { message: Message; conversationId: string }) => {
            if (data.conversationId === activeConvo) {
                setMessages(prev => [...prev, data.message]);
                socket.emit('mark_read', activeConvo);
            }
            // Update conversation list
            setConversations(prev => prev.map(c =>
                c._id === data.conversationId
                    ? { ...c, lastMessage: { content: data.message.content, sentAt: data.message.createdAt } }
                    : c
            ));
        };

        const handleTyping = (data: { conversationId: string; userName: string }) => {
            if (data.conversationId === activeConvo) {
                setTyping(data.userName);
                clearTimeout(typingTimeout.current);
                typingTimeout.current = setTimeout(() => setTyping(null), 3000);
            }
        };

        const handleStopTyping = (data: { conversationId: string }) => {
            if (data.conversationId === activeConvo) {
                setTyping(null);
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('user_typing', handleTyping);
        socket.on('user_stopped_typing', handleStopTyping);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('user_typing', handleTyping);
            socket.off('user_stopped_typing', handleStopTyping);
        };
    }, [socket, activeConvo]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = useCallback(() => {
        if (!newMessage.trim() || !activeConvo || !socket) return;

        socket.emit('send_message', {
            conversationId: activeConvo,
            content: newMessage.trim(),
            type: 'text'
        });

        socket.emit('typing_stop', activeConvo);
        setNewMessage('');
    }, [newMessage, activeConvo, socket]);

    const handleInputChange = (value: string) => {
        setNewMessage(value);
        if (socket && activeConvo) {
            socket.emit('typing_start', activeConvo);
            clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                socket.emit('typing_stop', activeConvo);
            }, 2000);
        }
    };

    const getOtherParticipant = (convo: Conversation) => {
        return convo.participants.find(p => p._id !== currentUserId.current) || convo.participants[0];
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const filteredConvos = conversations.filter(c => {
        if (!search) return true;
        const other = getOtherParticipant(c);
        return other?.name?.toLowerCase().includes(search.toLowerCase());
    });

    if (loading) {
        return <div className="messages-page"><div className="messages-loading"><div className="loader" /></div></div>;
    }

    return (
        <div className="messages-page">
            {/* Sidebar */}
            <aside className="msg-sidebar">
                <div className="msg-sidebar-header">
                    <h2>Messages</h2>
                </div>

                <div className="msg-search">
                    <FaSearch className="search-icon" />
                    <input
                        placeholder="Search conversations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="msg-list">
                    {filteredConvos.length === 0 ? (
                        <p className="no-convos">No conversations yet</p>
                    ) : (
                        filteredConvos.map(convo => {
                            const other = getOtherParticipant(convo);
                            return (
                                <div
                                    key={convo._id}
                                    className={`msg-item ${activeConvo === convo._id ? 'active' : ''}`}
                                    onClick={() => setActiveConvo(convo._id)}
                                >
                                    <div className="msg-item-avatar">
                                        {other?.avatar ? (
                                            <img src={other.avatar} alt={other.name} />
                                        ) : (
                                            <span>{other?.name?.charAt(0) || '?'}</span>
                                        )}
                                    </div>
                                    <div className="msg-item-info">
                                        <span className="msg-item-name">{other?.name}</span>
                                        <span className="msg-item-preview">
                                            {convo.lastMessage?.content || 'No messages yet'}
                                        </span>
                                    </div>
                                    {convo.lastMessage?.sentAt && (
                                        <span className="msg-item-time">
                                            {formatTime(convo.lastMessage.sentAt)}
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* Chat window */}
            <main className="msg-chat">
                {!activeConvo ? (
                    <div className="msg-empty">
                        <h3>Select a conversation</h3>
                        <p>Choose a conversation to start messaging</p>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div className="msg-chat-header">
                            {(() => {
                                const convo = conversations.find(c => c._id === activeConvo);
                                const other = convo ? getOtherParticipant(convo) : null;
                                return (
                                    <>
                                        <div className="msg-chat-avatar">
                                            {other?.avatar ? (
                                                <img src={other.avatar} alt="" />
                                            ) : (
                                                <span>{other?.name?.charAt(0) || '?'}</span>
                                            )}
                                        </div>
                                        <span className="msg-chat-name">{other?.name}</span>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Messages */}
                        <div className="msg-messages">
                            {messages.map(msg => (
                                <div
                                    key={msg._id}
                                    className={`msg-bubble ${msg.sender._id === currentUserId.current ? 'sent' : 'received'}`}
                                >
                                    {msg.type === 'code' && msg.codeBlock ? (
                                        <div className="code-message">
                                            <div className="code-lang"><FaCode /> {msg.codeBlock.language}</div>
                                            <pre><code>{msg.codeBlock.code}</code></pre>
                                        </div>
                                    ) : (
                                        <p>{msg.content}</p>
                                    )}
                                    <span className="msg-time">{formatTime(msg.createdAt)}</span>
                                </div>
                            ))}
                            {typing && (
                                <div className="msg-typing">
                                    <span>{typing} is typing...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="msg-input">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                                className="send-btn"
                            >
                                <FaPaperPlane />
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Messages;
