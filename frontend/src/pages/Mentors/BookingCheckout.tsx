import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaCalendarAlt, FaClock, FaVideo, FaCheckCircle } from 'react-icons/fa';
import './BookingCheckout.css';

const API = import.meta.env.VITE_API_URL || '';
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

interface LocationState {
    mentor: {
        _id: string;
        slug: string;
        headline: string;
        pricing: { thirtyMin: number; sixtyMin: number };
        user: { name: string; avatar?: string };
    };
    duration: 30 | 60;
}

const BookingCheckout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LocationState | undefined;

    const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
    const [scheduledAt, setScheduledAt] = useState('');
    const [topic, setTopic] = useState('');
    const [agenda, setAgenda] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [bookingResult, setBookingResult] = useState<{
        bookingId: string;
        meetingLink?: string;
    } | null>(null);

    if (!state?.mentor) {
        return (
            <div className="checkout-page">
                <div className="checkout-empty">
                    <h2>No booking details</h2>
                    <p>Please select a mentor first.</p>
                    <button onClick={() => navigate('/mentors')}>Browse Mentors</button>
                </div>
            </div>
        );
    }

    const { mentor, duration } = state;
    const price = duration === 30 ? mentor.pricing.thirtyMin : mentor.pricing.sixtyMin;

    const handleBooking = async () => {
        if (!scheduledAt) {
            toast.error('Please select a date and time');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Step 1: Create booking (returns Razorpay order)
            const { data } = await axios.post(`${API}/api/bookings`, {
                mentorId: mentor._id,
                scheduledAt: new Date(scheduledAt).toISOString(),
                duration,
                type: 'video',
                topic: topic || undefined,
                agenda: agenda || undefined,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }, { headers });

            if (!data.success) {
                toast.error(data.message || 'Failed to create booking');
                return;
            }

            const booking = data.data.booking;
            const razorpayOrder = data.data.razorpayOrder;

            // Step 2: Open Razorpay checkout
            if (razorpayOrder && RAZORPAY_KEY) {
                await openRazorpayCheckout(razorpayOrder, booking);
            } else {
                // No Razorpay configured — treat as success (dev mode)
                setBookingResult({ bookingId: booking.bookingId });
                setStep('success');
                toast.success('Booking created (dev mode)');
            }
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Booking failed';
            toast.error(msg as string);
        } finally {
            setSubmitting(false);
        }
    };

    const openRazorpayCheckout = (order: { id: string; amount: number; currency: string }, booking: { bookingId: string; _id: string }) => {
        return new Promise<void>((resolve, reject) => {
            const options = {
                key: RAZORPAY_KEY,
                amount: order.amount,
                currency: order.currency,
                name: 'Graphora',
                description: `Mentorship - ${duration} min session`,
                order_id: order.id,
                handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                    try {
                        const token = localStorage.getItem('token');
                        const { data } = await axios.post(`${API}/api/payments/verify`, {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            bookingId: booking.bookingId
                        }, { headers: { Authorization: `Bearer ${token}` } });

                        if (data.success) {
                            setBookingResult({ bookingId: booking.bookingId });
                            setStep('success');
                            toast.success('Payment verified! Booking confirmed.');
                        }
                        resolve();
                    } catch {
                        toast.error('Payment verification failed');
                        reject();
                    }
                },
                theme: { color: '#6366f1' },
                modal: {
                    ondismiss: () => {
                        toast.error('Payment cancelled');
                        resolve();
                    }
                }
            };

            const win = window as unknown as { Razorpay: new (opts: typeof options) => { open: () => void } };
            if (win.Razorpay) {
                const rzp = new win.Razorpay(options);
                rzp.open();
            } else {
                toast.error('Payment gateway not loaded');
                reject();
            }
        });
    };

    // Success screen
    if (step === 'success' && bookingResult) {
        return (
            <div className="checkout-page">
                <div className="checkout-success">
                    <div className="success-icon"><FaCheckCircle /></div>
                    <h2>Booking Confirmed!</h2>
                    <p>Your session with <strong>{mentor.user.name}</strong> has been booked.</p>
                    <div className="success-details">
                        <span>Booking ID: {bookingResult.bookingId}</span>
                    </div>
                    <div className="success-actions">
                        <button className="primary" onClick={() => navigate('/dashboard')}>
                            Go to Dashboard
                        </button>
                        <button className="secondary" onClick={() => navigate('/mentors')}>
                            Browse More Mentors
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                {/* Left: Form */}
                <div className="checkout-form">
                    <h1>Book Session</h1>

                    <div className="checkout-mentor-card">
                        <div className="cmc-avatar">
                            {mentor.user?.avatar ? (
                                <img src={mentor.user.avatar} alt={mentor.user.name} />
                            ) : (
                                <div className="avatar-placeholder">{mentor.user.name?.charAt(0)}</div>
                            )}
                        </div>
                        <div>
                            <h3>{mentor.user.name}</h3>
                            <p>{mentor.headline}</p>
                        </div>
                    </div>

                    <div className="form-group">
                        <label><FaCalendarAlt /> Date & Time</label>
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Topic (optional)</label>
                        <input
                            type="text"
                            placeholder="e.g., System Design, Mock Interview"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Agenda (optional)</label>
                        <textarea
                            placeholder="What would you like to cover in this session?"
                            value={agenda}
                            onChange={(e) => setAgenda(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>

                {/* Right: Summary */}
                <div className="checkout-summary">
                    <h3>Summary</h3>
                    <div className="summary-item">
                        <FaClock />
                        <span>{duration} minutes</span>
                    </div>
                    <div className="summary-item">
                        <FaVideo />
                        <span>Video Call (Jitsi)</span>
                    </div>
                    {scheduledAt && (
                        <div className="summary-item">
                            <FaCalendarAlt />
                            <span>{new Date(scheduledAt).toLocaleString()}</span>
                        </div>
                    )}

                    <div className="summary-divider" />

                    <div className="summary-price">
                        <span>Session fee</span>
                        <span>₹{price}</span>
                    </div>
                    <div className="summary-total">
                        <span>Total</span>
                        <span>₹{price}</span>
                    </div>

                    <button
                        className="pay-btn"
                        onClick={handleBooking}
                        disabled={submitting || !scheduledAt}
                    >
                        {submitting ? 'Processing...' : `Pay ₹${price}`}
                    </button>

                    <p className="checkout-policy">
                        Free cancellation up to 24h before session. 50% refund for 4–24h. No refund within 4h.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BookingCheckout;
