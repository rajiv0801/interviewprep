import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaStar, FaBriefcase, FaClock, FaGlobe, FaLinkedin, FaCalendarAlt, FaComments } from 'react-icons/fa';
import './MentorProfile.css';

const API = import.meta.env.VITE_API_URL || '';

interface Mentor {
    _id: string;
    slug: string;
    headline: string;
    bio: string;
    expertise: string[];
    experience: { years: number; currentCompany: string; currentRole: string; pastCompanies: string[] };
    pricing: { thirtyMin: number; sixtyMin: number; currency: string };
    rating: { average: number; count: number };
    totalSessions: number;
    avatar?: string;
    languages: string[];
    sessionTopics: string[];
    availability: { dayOfWeek: number; slots: { start: string; end: string }[] }[];
    timezone: string;
    linkedinUrl?: string;
    user: { name: string; avatar?: string; email?: string };
}

interface Review {
    _id: string;
    rating: number;
    review: string;
    student: { name: string; avatar?: string };
    mentorReply?: { content: string; repliedAt: string };
    createdAt: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MentorProfile: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [mentor, setMentor] = useState<Mentor | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDuration, setSelectedDuration] = useState<30 | 60>(30);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const [mentorRes, reviewsRes] = await Promise.all([
                    axios.get(`${API}/api/mentors/${slug}`, { headers }),
                    axios.get(`${API}/api/mentors/${slug}/reviews`, { headers, params: { limit: 5 } })
                        .catch(() => ({ data: { data: { reviews: [] } } }))
                ]);

                if (mentorRes.data.success) {
                    setMentor(mentorRes.data.data.mentor);
                }
                setReviews(reviewsRes.data.data?.reviews || []);
            } catch {
                toast.error('Failed to load mentor profile');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug]);

    const getPrice = () => {
        if (!mentor) return 0;
        return selectedDuration === 30 ? mentor.pricing.thirtyMin : mentor.pricing.sixtyMin;
    };

    const renderStars = (rating: number) => (
        Array.from({ length: 5 }, (_, i) => (
            <FaStar key={i} className={`star ${i < Math.round(rating) ? 'filled' : ''}`} />
        ))
    );

    if (loading) {
        return <div className="mentor-profile-loading"><div className="loader" /></div>;
    }

    if (!mentor) {
        return (
            <div className="mentor-not-found">
                <h2>Mentor not found</h2>
                <button onClick={() => navigate('/mentors')}>Browse Mentors</button>
            </div>
        );
    }

    return (
        <div className="mentor-profile-page">
            <div className="mp-container">
                {/* Left Column - Profile Details */}
                <div className="mp-main">
                    {/* Header */}
                    <div className="mp-header">
                        <div className="mp-avatar-large">
                            {mentor.user?.avatar || mentor.avatar ? (
                                <img src={mentor.user?.avatar || mentor.avatar} alt={mentor.user?.name} />
                            ) : (
                                <div className="avatar-placeholder large">
                                    {mentor.user?.name?.charAt(0) || 'M'}
                                </div>
                            )}
                        </div>
                        <div className="mp-header-info">
                            <h1>{mentor.user?.name}</h1>
                            <p className="mp-headline">{mentor.headline}</p>
                            <div className="mp-meta">
                                {mentor.experience?.currentCompany && (
                                    <span><FaBriefcase /> {mentor.experience.currentRole} @ {mentor.experience.currentCompany}</span>
                                )}
                                {mentor.experience?.years && (
                                    <span><FaClock /> {mentor.experience.years} yrs experience</span>
                                )}
                                <span><FaGlobe /> {mentor.timezone}</span>
                            </div>
                            <div className="mp-header-stats">
                                <div className="stat">
                                    <div className="stars">{renderStars(mentor.rating.average)}</div>
                                    <span>{mentor.rating.average.toFixed(1)} ({mentor.rating.count} reviews)</span>
                                </div>
                                <div className="stat">
                                    <FaComments />
                                    <span>{mentor.totalSessions} sessions</span>
                                </div>
                                {mentor.linkedinUrl && (
                                    <a href={mentor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="linkedin-link">
                                        <FaLinkedin /> LinkedIn
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    <section className="mp-section">
                        <h2>About</h2>
                        <p className="mp-bio">{mentor.bio}</p>
                    </section>

                    {/* Expertise */}
                    <section className="mp-section">
                        <h2>Expertise</h2>
                        <div className="mp-tags">
                            {mentor.expertise.map(e => <span key={e} className="tag expertise">{e}</span>)}
                        </div>
                    </section>

                    {/* Session Topics */}
                    <section className="mp-section">
                        <h2>Session Topics</h2>
                        <div className="mp-tags">
                            {mentor.sessionTopics.map(t => <span key={t} className="tag topic">{t}</span>)}
                        </div>
                    </section>

                    {/* Experience */}
                    {mentor.experience?.pastCompanies?.length > 0 && (
                        <section className="mp-section">
                            <h2>Past Companies</h2>
                            <div className="mp-companies">
                                {mentor.experience.pastCompanies.map(c => (
                                    <span key={c} className="company-badge">{c}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Languages */}
                    <section className="mp-section">
                        <h2>Languages</h2>
                        <div className="mp-tags">
                            {mentor.languages.map(l => <span key={l} className="tag lang">{l}</span>)}
                        </div>
                    </section>

                    {/* Availability */}
                    <section className="mp-section">
                        <h2>Availability</h2>
                        <div className="mp-availability">
                            {mentor.availability?.length > 0 ? (
                                mentor.availability.map(a => (
                                    <div key={a.dayOfWeek} className="avail-day">
                                        <span className="day-name">{DAYS[a.dayOfWeek]}</span>
                                        <div className="day-slots">
                                            {a.slots.map((s, i) => (
                                                <span key={i} className="slot">{s.start} – {s.end}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-avail">No availability set yet.</p>
                            )}
                        </div>
                    </section>

                    {/* Reviews */}
                    <section className="mp-section">
                        <h2>Reviews ({mentor.rating.count})</h2>
                        {reviews.length > 0 ? (
                            <div className="mp-reviews">
                                {reviews.map(review => (
                                    <div key={review._id} className="review-card">
                                        <div className="review-top">
                                            <div className="review-user">
                                                <div className="review-avatar">
                                                    {review.student?.name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <span className="review-name">{review.student?.name}</span>
                                                    <span className="review-date">
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="stars small">{renderStars(review.rating)}</div>
                                        </div>
                                        <p className="review-text">{review.review}</p>
                                        {review.mentorReply && (
                                            <div className="mentor-reply">
                                                <span className="reply-label">Mentor replied:</span>
                                                <p>{review.mentorReply.content}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-reviews">No reviews yet.</p>
                        )}
                    </section>
                </div>

                {/* Right Column - Booking Widget */}
                <aside className="mp-sidebar">
                    <div className="booking-widget">
                        <h3>Book a Session</h3>

                        <div className="duration-toggle">
                            {mentor.pricing.thirtyMin && (
                                <button
                                    className={selectedDuration === 30 ? 'active' : ''}
                                    onClick={() => setSelectedDuration(30)}
                                >
                                    30 min — ₹{mentor.pricing.thirtyMin}
                                </button>
                            )}
                            {mentor.pricing.sixtyMin && (
                                <button
                                    className={selectedDuration === 60 ? 'active' : ''}
                                    onClick={() => setSelectedDuration(60)}
                                >
                                    60 min — ₹{mentor.pricing.sixtyMin}
                                </button>
                            )}
                        </div>

                        <div className="booking-summary">
                            <div className="summary-row">
                                <span>Duration</span>
                                <span>{selectedDuration} minutes</span>
                            </div>
                            <div className="summary-row">
                                <span>Session type</span>
                                <span>Video Call</span>
                            </div>
                            <div className="summary-row total">
                                <span>Total</span>
                                <span className="total-price">₹{getPrice()}</span>
                            </div>
                        </div>

                        <button
                            className="cta-book"
                            onClick={() => navigate(`/mentors/${mentor.slug}/book`, {
                                state: { mentor, duration: selectedDuration }
                            })}
                        >
                            <FaCalendarAlt /> Book & Pay ₹{getPrice()}
                        </button>

                        <p className="booking-note">
                            Free cancellation up to 24h before the session
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default MentorProfile;
