import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell/NotificationBell';
import { useSocket } from '../context/SocketContext';
import './Navbar.css';

// Custom hook to sync with localStorage
const useAuthState = () => {
    const getSnapshot = () => {
        const token = localStorage.getItem('token');
        const userName = localStorage.getItem('userName');
        return JSON.stringify({ isLoggedIn: !!token, userName: userName || '' });
    };

    const subscribe = (callback: () => void) => {
        window.addEventListener('storage', callback);
        // Also listen for custom auth events
        window.addEventListener('authChange', callback);
        return () => {
            window.removeEventListener('storage', callback);
            window.removeEventListener('authChange', callback);
        };
    };

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return JSON.parse(state) as { isLoggedIn: boolean; userName: string };
};

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showDropdown, setShowDropdown] = useState(false);
    const [hidden, setHidden] = useState(false);
    const lastScrollY = useRef(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Use sync external store for auth state
    const { isLoggedIn, userName } = useAuthState();

    // Derive active nav link from current location (no effect needed)
    const active = useMemo(() => {
        const path = location.pathname;

        if (path.startsWith('/problems')) return 'Problems';
        if (path.startsWith('/mock-test')) return 'Mock Test';
        if (path.startsWith('/companies')) return 'Companies';
        if (path.startsWith('/mentors')) return 'Mentors';
        if (path.startsWith('/roadmaps')) return 'Roadmaps';
        if (path === '/') return 'Problems';
        return '';
    }, [location.pathname]);

    // Hide navbar on scroll down, show on scroll up
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
                setHidden(true);
            } else {
                setHidden(false);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        setShowDropdown(false);
        // Dispatch event to trigger UI update
        window.dispatchEvent(new Event('authChange'));
        navigate('/');
    };

    const { unreadMessages } = useSocket();

    const navLinks = [
        { name: 'Problems', href: '/problems' },
        { name: 'Roadmaps', href: '/roadmaps' },
        { name: 'Companies', href: '/companies' },
        { name: 'Mentors', href: '/mentors' },
        { name: 'Mock Test', href: '/mock-test' },
    ];

    const getInitials = (name: string) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: hidden ? -100 : 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="navbar"
        >
            <div className="container navbar-container">
                <Link to="/" className="logo">
                    <span className="logo-symbol">/</span>
                    Graphora
                </Link>

                <div className="nav-center">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className={`nav-link ${active === link.name ? 'active' : ''}`}
                        >
                            <span className="nav-text">{link.name}</span>
                            {active === link.name && (
                                <motion.div
                                    layoutId="nav-underline"
                                    className="nav-highlight"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </a>
                    ))}
                </div>

                <div className="nav-right">
                    {isLoggedIn ? (
                        <>
                            <Link to="/messages" className="nav-icon-btn" title="Messages">
                                💬
                                {unreadMessages > 0 && (
                                    <span className="icon-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
                                )}
                            </Link>
                            <NotificationBell />
                            <div className="profile-dropdown-container" ref={dropdownRef}>
                                <button
                                    className="profile-btn"
                                    onClick={() => setShowDropdown(!showDropdown)}
                                >
                                    <div className="avatar">
                                        {getInitials(userName)}
                                    </div>
                                    <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
                                </button>

                                <AnimatePresence>
                                    {showDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="profile-dropdown"
                                        >
                                            <Link
                                                to="/dashboard"
                                                className="dropdown-item"
                                                onClick={() => setShowDropdown(false)}
                                            >
                                                <span className="dropdown-icon">📊</span>
                                                Dashboard
                                            </Link>
                                            <Link
                                                to="/profile"
                                                className="dropdown-item"
                                                onClick={() => setShowDropdown(false)}
                                            >
                                                <span className="dropdown-icon">👤</span>
                                                Coding Profile
                                            </Link>
                                            <Link
                                                to="/settings"
                                                className="dropdown-item"
                                                onClick={() => setShowDropdown(false)}
                                            >
                                                <span className="dropdown-icon">⚙️</span>
                                                Settings
                                            </Link>
                                            <div className="dropdown-divider" />
                                            <button
                                                className="dropdown-item logout"
                                                onClick={handleLogout}
                                            >
                                                <span className="dropdown-icon">🚪</span>
                                                Logout
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    ) : (
                        <Link to="/login">
                            <button className="login-btn">
                                Login
                                <span className="btn-arrow">→</span>
                            </button>
                        </Link>
                    )}
                </div>
            </div>
        </motion.nav>
    );
};

export default Navbar;
