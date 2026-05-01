import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaSearch, FaStar, FaChevronDown, FaChevronUp, FaBriefcase } from 'react-icons/fa';
import './Mentors.css';

const API = import.meta.env.VITE_API_URL || '';

interface Mentor {
    _id: string;
    slug: string;
    headline: string;
    bio: string;
    expertise: string[];
    experience: { years: number; currentCompany: string; currentRole: string };
    pricing: { thirtyMin: number; sixtyMin: number; currency: string };
    rating: { average: number; count: number };
    totalSessions: number;
    avatar?: string;
    languages: string[];
    sessionTopics: string[];
    user: { name: string; avatar?: string };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

const EXPERTISE_OPTIONS = ['DSA', 'System Design', 'Frontend', 'Backend', 'ML/AI', 'DevOps', 'Mobile'];
const SORT_OPTIONS = [
    { value: 'rating', label: 'Top Rated' },
    { value: 'price_asc', label: 'Price: Low-High' },
    { value: 'price_desc', label: 'Price: High-Low' },
    { value: 'sessions', label: 'Most Sessions' },
    { value: 'newest', label: 'Newest' }
];

const Mentors: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, pages: 0 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [expertise, setExpertise] = useState(searchParams.get('expertise') || '');
    const [sort, setSort] = useState(searchParams.get('sort') || 'rating');
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(true);

    const fetchMentors = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params: Record<string, string | number> = {
                page,
                limit: 12,
                sort
            };
            if (expertise) params.expertise = expertise;
            if (search) params.company = search;

            const { data } = await axios.get(`${API}/api/mentors`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });

            if (data.success) {
                setMentors(data.data.mentors);
                setPagination(data.data.pagination);
            }
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Failed to load mentors';
            toast.error(msg as string);
        } finally {
            setLoading(false);
        }
    }, [expertise, sort, search]);

    useEffect(() => {
        fetchMentors(1);
    }, [fetchMentors]);

    useEffect(() => {
        const params: Record<string, string> = {};
        if (expertise) params.expertise = expertise;
        if (sort !== 'rating') params.sort = sort;
        setSearchParams(params, { replace: true });
    }, [expertise, sort, setSearchParams]);

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <FaStar key={i} className={`star ${i < Math.round(rating) ? 'filled' : ''}`} />
        ));
    };

    return (
        <div className="mentors-page">
            {/* Header */}
            <div className="mentors-header">
                <div className="mentors-header-content">
                    <h1>Find Your Mentor</h1>
                    <p>Book 1:1 sessions with experienced engineers from top tech companies</p>
                </div>

                <div className="mentors-controls">
                    <div className="search-box">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by company..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        className="sort-select"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                    >
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mentors-layout">
                {/* Sidebar Filters */}
                <aside className="mentors-sidebar">
                    <div className="filter-header" onClick={() => setShowFilters(!showFilters)}>
                        <span className="filter-title">FILTERS</span>
                        {showFilters ? <FaChevronUp className="filter-icon" /> : <FaChevronDown className="filter-icon" />}
                    </div>

                    {showFilters && (
                        <div className="filter-sections">
                            <div className="filter-section">
                                <h4>Expertise</h4>
                                <div className="filter-chips">
                                    {EXPERTISE_OPTIONS.map(exp => (
                                        <button
                                            key={exp}
                                            className={`chip ${expertise === exp ? 'active' : ''}`}
                                            onClick={() => setExpertise(expertise === exp ? '' : exp)}
                                        >
                                            {exp}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {expertise && (
                                <button className="clear-filters" onClick={() => { setExpertise(''); setSearch(''); }}>
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    )}
                </aside>

                {/* Mentor Grid */}
                <main className="mentors-grid-container">
                    {loading ? (
                        <div className="mentors-loading">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="mentor-card skeleton" />
                            ))}
                        </div>
                    ) : mentors.length === 0 ? (
                        <div className="mentors-empty">
                            <h3>No mentors found</h3>
                            <p>Try adjusting your filters or check back later.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mentors-grid">
                                {mentors.map(mentor => (
                                    <div
                                        key={mentor._id}
                                        className="mentor-card"
                                        onClick={() => navigate(`/mentors/${mentor.slug}`)}
                                    >
                                        <div className="mentor-card-top">
                                            <div className="mentor-avatar">
                                                {mentor.user?.avatar || mentor.avatar ? (
                                                    <img src={mentor.user?.avatar || mentor.avatar} alt={mentor.user?.name} />
                                                ) : (
                                                    <div className="avatar-placeholder">
                                                        {mentor.user?.name?.charAt(0) || 'M'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mentor-info">
                                                <h3>{mentor.user?.name}</h3>
                                                <p className="mentor-headline">{mentor.headline}</p>
                                            </div>
                                        </div>

                                        {mentor.experience?.currentCompany && (
                                            <div className="mentor-company">
                                                <FaBriefcase />
                                                <span>{mentor.experience.currentRole} @ {mentor.experience.currentCompany}</span>
                                            </div>
                                        )}

                                        <div className="mentor-tags">
                                            {mentor.expertise.slice(0, 3).map(tag => (
                                                <span key={tag} className="tag">{tag}</span>
                                            ))}
                                        </div>

                                        <div className="mentor-card-bottom">
                                            <div className="mentor-rating">
                                                <div className="stars">{renderStars(mentor.rating.average)}</div>
                                                <span className="rating-text">
                                                    {mentor.rating.average.toFixed(1)} ({mentor.rating.count})
                                                </span>
                                            </div>
                                            <div className="mentor-price">
                                                <span className="price-amount">
                                                    ₹{mentor.pricing.thirtyMin || mentor.pricing.sixtyMin}
                                                </span>
                                                <span className="price-duration">
                                                    /{mentor.pricing.thirtyMin ? '30' : '60'} min
                                                </span>
                                            </div>
                                        </div>

                                        <button className="book-btn" onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/mentors/${mentor.slug}`);
                                        }}>
                                            View Profile
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {pagination.pages > 1 && (
                                <div className="mentors-pagination">
                                    <button
                                        disabled={pagination.page <= 1}
                                        onClick={() => fetchMentors(pagination.page - 1)}
                                    >
                                        Previous
                                    </button>
                                    <span>{pagination.page} / {pagination.pages}</span>
                                    <button
                                        disabled={pagination.page >= pagination.pages}
                                        onClick={() => fetchMentors(pagination.page + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Mentors;
