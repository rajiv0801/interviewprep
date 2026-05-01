import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { MentorRequest } from '../middleware/mentorMiddleware';
import Booking from '../models/booking';
import Mentor from '../models/mentor';
import MentorReview from '../models/mentorReview';
import Notification from '../models/notification';
import razorpayService from '../services/razorpayService';
import jitsiService from '../services/jitsiService';
import mentorEmailService from '../services/mentorEmailService';


const sendSuccess = (res: Response, data: unknown, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res: Response, message: string, statusCode = 400, error?: unknown) => {
    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined
    });
};

const createNotification = async (
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, unknown>,
    actionUrl?: string
) => {
    try {
        await Notification.create({ user: userId, type, title, message, data, actionUrl });
    } catch (err) {
        console.error('[createNotification] Failed:', err);
    }
};


export const createBooking = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const student = req.user!;
        const { mentorId, scheduledAt, duration, type, topic, agenda, timezone } = req.body;

        const mentor = await Mentor.findById(mentorId).populate('user', 'name email');
        if (!mentor) {
            sendError(res, 'Mentor not found', 404);
            return;
        }
        if (!mentor.isAcceptingBookings || !mentor.verified) {
            sendError(res, 'This mentor is not currently accepting bookings', 400);
            return;
        }

        const sessionStart = new Date(scheduledAt);
        const sessionEnd = new Date(sessionStart.getTime() + duration * 60 * 1000);

        const conflict = await Booking.findOne({
            mentor: mentorId,
            status: { $in: ['pending', 'confirmed', 'in_progress'] },
            $or: [
                { scheduledAt: { $gte: sessionStart, $lt: sessionEnd } },
                {
                    scheduledAt: { $lt: sessionStart },
                    $expr: {
                        $gt: [
                            { $add: ['$scheduledAt', { $multiply: ['$duration', 60000] }] },
                            sessionStart.getTime()
                        ]
                    }
                }
            ]
        });

        if (conflict) {
            sendError(res, 'This time slot is already booked. Please choose another time.', 409);
            return;
        }

        const amount = duration === 30 ? mentor.pricing.thirtyMin : mentor.pricing.sixtyMin;
        if (!amount) {
            sendError(res, `Mentor has not set pricing for ${duration}-minute sessions`, 400);
            return;
        }

        const bookingId = `BK-${uuidv4().slice(0, 8).toUpperCase()}`;
        const razorpayOrder = await razorpayService.createOrder({
            amount,
            currency: mentor.pricing.currency || 'INR',
            receipt: bookingId,
            notes: {
                bookingId,
                mentorId: mentorId.toString(),
                studentId: student._id.toString()
            }
        });

        const { platformFee, mentorPayout } = razorpayService.calculateSplit(amount);

        const booking = await Booking.create({
            bookingId,
            mentor: mentorId,
            student: student._id,
            scheduledAt: sessionStart,
            duration,
            timezone: timezone || 'Asia/Kolkata',
            type: type || 'video',
            topic,
            agenda,
            status: 'pending',
            payment: {
                amount,
                currency: mentor.pricing.currency || 'INR',
                razorpayOrderId: razorpayOrder.id,
                status: 'pending'
            },
            platformFee,
            mentorPayout: {
                amount: mentorPayout,
                status: 'pending'
            }
        });

        sendSuccess(res, {
            booking: {
                _id: booking._id,
                bookingId: booking.bookingId,
                scheduledAt: booking.scheduledAt,
                duration: booking.duration,
                amount
            },
            razorpay: {
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId: process.env.RAZORPAY_KEY_ID
            }
        }, 'Booking initiated. Complete payment to confirm.', 201);
    } catch (error) {
        console.error('[createBooking]', error);
        sendError(res, 'Failed to create booking', 500, error);
    }
};
export const getUserBookings = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { status, role, page = '1', limit = '10' } = req.query as Record<string, string>;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const filter: Record<string, unknown> = {};
        if (role === 'mentor' && user.mentorProfile) {
            filter.mentor = user.mentorProfile;
        } else {
            filter.student = user._id;
        }
        if (status) filter.status = status;

        const [bookings, total] = await Promise.all([
            Booking.find(filter)
                .populate('mentor', 'slug avatar headline pricing rating')
                .populate('student', 'name avatar')
                .sort({ scheduledAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Booking.countDocuments(filter)
        ]);

        sendSuccess(res, {
            bookings,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    } catch (error) {
        console.error('[getUserBookings]', error);
        sendError(res, 'Failed to fetch bookings', 500, error);
    }
};

export const getBooking = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { id } = req.params;

        const booking = await Booking.findOne({
            $or: [{ _id: id }, { bookingId: id }]
        })
            .populate('mentor', 'slug avatar headline pricing user')
            .populate('student', 'name avatar email');

        if (!booking) {
            sendError(res, 'Booking not found', 404);
            return;
        }

        const isStudent = booking.student._id.toString() === user._id.toString();
        const isMentor = user.mentorProfile &&
            booking.mentor._id.toString() === user.mentorProfile.toString();

        if (!isStudent && !isMentor && user.role !== 'admin') {
            sendError(res, 'Access denied', 403);
            return;
        }

        sendSuccess(res, { booking });
    } catch (error) {
        console.error('[getBooking]', error);
        sendError(res, 'Failed to fetch booking', 500, error);
    }
};

export const cancelBooking = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { id } = req.params;
        const { reason } = req.body;

        const booking = await Booking.findOne({
            $or: [{ _id: id }, { bookingId: id }]
        });

        if (!booking) {
            sendError(res, 'Booking not found', 404);
            return;
        }

        const isStudent = booking.student.toString() === user._id.toString();
        const isMentor = user.mentorProfile &&
            booking.mentor.toString() === user.mentorProfile.toString();

        if (!isStudent && !isMentor && user.role !== 'admin') {
            sendError(res, 'Access denied', 403);
            return;
        }

        if (['completed', 'cancelled', 'no_show'].includes(booking.status)) {
            sendError(res, `Cannot cancel a booking with status: ${booking.status}`, 400);
            return;
        }

        const cancelledBy = isStudent ? 'student' : isMentor ? 'mentor' : 'system';

        const hoursUntilSession = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
        let refundAmount = 0;

        if (booking.payment.status === 'paid' && booking.payment.razorpayPaymentId) {
            if (hoursUntilSession >= 24) {
                refundAmount = booking.payment.amount;
            } else if (hoursUntilSession >= 2) {
                refundAmount = Math.round(booking.payment.amount * 0.5);
            }

            if (refundAmount > 0) {
                try {
                    const refund = await razorpayService.refundPayment(
                        booking.payment.razorpayPaymentId,
                        refundAmount
                    );
                    booking.refund = {
                        amount: refundAmount,
                        reason,
                        processedAt: new Date(),
                        razorpayRefundId: refund.id
                    };
                    booking.payment.status = 'refunded';
                } catch (refundErr) {
                    console.error('[cancelBooking] Refund failed:', refundErr);
                }
            }
        }

        booking.status = 'cancelled';
        booking.cancelledBy = cancelledBy;
        booking.cancellationReason = reason;
        booking.cancelledAt = new Date();
        await booking.save();

        const mentorDoc = await Mentor.findById(booking.mentor).populate('user', 'name email');
        const studentDoc = await Booking.findById(booking._id).populate('student', 'name email');

        if (mentorDoc?.user) {
            const mentorUser = mentorDoc.user as unknown as { _id: string; name: string; email: string };
            await createNotification(
                mentorUser._id.toString(),
                'booking_cancelled',
                'Session Cancelled',
                `A session scheduled for ${booking.scheduledAt.toLocaleDateString()} was cancelled.`,
                { bookingId: booking.bookingId },
                `/mentor/dashboard`
            );
        }

        sendSuccess(res, {
            booking: { status: booking.status, refundAmount, cancelledBy }
        }, `Booking cancelled${refundAmount > 0 ? `. Refund of ₹${refundAmount} initiated.` : '.'}`);
    } catch (error) {
        console.error('[cancelBooking]', error);
        sendError(res, 'Failed to cancel booking', 500, error);
    }
};

// ==================== START SESSION ====================

/**
 * PUT /api/bookings/:id/start
 * Mentor starts the session — generates Jitsi room and updates status.
 */
export const startSession = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const mentor = req.mentor!;

        const booking = await Booking.findOne({
            $or: [{ _id: id }, { bookingId: id }],
            mentor: mentor._id,
            status: 'confirmed'
        }).populate('student', 'name email _id');

        if (!booking) {
            sendError(res, 'Booking not found or not in confirmed state', 404);
            return;
        }

        // Check session is within 15 minutes of scheduled time
        const minutesUntil = (booking.scheduledAt.getTime() - Date.now()) / (1000 * 60);
        if (minutesUntil > 15) {
            sendError(res, `Session can only be started within 15 minutes of scheduled time. Starts in ${Math.round(minutesUntil)} minutes.`, 400);
            return;
        }

        // Generate Jitsi room
        const mentorUser = await Mentor.findById(mentor._id).populate('user', 'name');
        const mentorName = (mentorUser?.user as unknown as { name: string } | undefined)?.name || 'Mentor';
        const student = booking.student as unknown as { name: string };

        const jitsiRoom = jitsiService.createRoom({
            bookingId: booking.bookingId,
            mentorName,
            studentName: student.name,
            duration: booking.duration
        });

        booking.status = 'in_progress';
        booking.jitsiRoomName = jitsiRoom.roomName;
        booking.meetingLink = jitsiRoom.meetingLink;
        booking.meetingProvider = 'jitsi';
        await booking.save();

        // Notify student
        const studentDoc = booking.student as unknown as { _id: string; name: string };
        await createNotification(
            studentDoc._id.toString(),
            'session_started',
            'Your Session Has Started!',
            `${mentorName} has started your session. Join now!`,
            { bookingId: booking.bookingId, meetingLink: jitsiRoom.meetingLink },
            jitsiRoom.meetingLink
        );

        sendSuccess(res, {
            jitsiRoom,
            booking: { status: booking.status, meetingLink: booking.meetingLink }
        }, 'Session started');
    } catch (error) {
        console.error('[startSession]', error);
        sendError(res, 'Failed to start session', 500, error);
    }
};

// ==================== COMPLETE SESSION ====================

/**
 * PUT /api/bookings/:id/complete
 * Mentor marks session as completed.
 */
export const completeSession = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const mentor = req.mentor!;

        const booking = await Booking.findOne({
            $or: [{ _id: id }, { bookingId: id }],
            mentor: mentor._id,
            status: 'in_progress'
        }).populate('student', 'name email _id');

        if (!booking) {
            sendError(res, 'Booking not found or not in progress', 404);
            return;
        }

        booking.status = 'completed';
        await booking.save();

        // Update mentor stats
        await Mentor.findByIdAndUpdate(mentor._id, {
            $inc: { totalSessions: 1, totalEarnings: booking.mentorPayout?.amount || 0 }
        });

        // Notify student to leave a review
        const studentDoc = booking.student as unknown as { _id: string; name: string };
        await createNotification(
            studentDoc._id.toString(),
            'session_completed',
            'Session Completed',
            'Your session is complete! Share your feedback to help the mentor.',
            { bookingId: booking.bookingId },
            `/bookings/${booking.bookingId}`
        );

        sendSuccess(res, { booking: { status: booking.status } }, 'Session marked as completed');
    } catch (error) {
        console.error('[completeSession]', error);
        sendError(res, 'Failed to complete session', 500, error);
    }
};

// ==================== SUBMIT REVIEW ====================

/**
 * POST /api/bookings/:id/review
 * Student submits a review after a completed session.
 */
export const submitReview = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { id } = req.params;
        const { rating, review } = req.body;

        const booking = await Booking.findOne({
            $or: [{ _id: id }, { bookingId: id }],
            student: user._id,
            status: 'completed'
        });

        if (!booking) {
            sendError(res, 'Booking not found or not eligible for review', 404);
            return;
        }

        // Check if already reviewed
        const existing = await MentorReview.findOne({ booking: booking._id });
        if (existing) {
            sendError(res, 'You have already submitted a review for this session', 409);
            return;
        }

        // Create review
        const mentorReview = await MentorReview.create({
            booking: booking._id,
            mentor: booking.mentor,
            student: user._id,
            rating,
            review,
            isPublic: true
        });

        // Update booking feedback
        booking.studentFeedback = { rating, review, submittedAt: new Date() };
        await booking.save();

        // Recalculate mentor rating
        const ratingStats = await MentorReview.aggregate([
            { $match: { mentor: booking.mentor, isPublic: true, isReported: false } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);

        if (ratingStats.length > 0) {
            await Mentor.findByIdAndUpdate(booking.mentor, {
                'rating.average': Math.round(ratingStats[0].avg * 10) / 10,
                'rating.count': ratingStats[0].count
            });
        }

        // Notify mentor
        const mentorDoc = await Mentor.findById(booking.mentor).populate('user', '_id');
        if (mentorDoc?.user) {
            const mentorUser = mentorDoc.user as unknown as { _id: string };
            await createNotification(
                mentorUser._id.toString(),
                'review_received',
                'New Review Received',
                `You received a ${rating}-star review!`,
                { bookingId: booking.bookingId, rating },
                `/mentor/dashboard`
            );
        }

        sendSuccess(res, { review: mentorReview }, 'Review submitted successfully', 201);
    } catch (error) {
        console.error('[submitReview]', error);
        sendError(res, 'Failed to submit review', 500, error);
    }
};

// ==================== ADD SESSION NOTES ====================

/**
 * PUT /api/bookings/:id/notes
 * Mentor adds session notes (visible to student after session).
 */
export const addSessionNotes = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const mentor = req.mentor!;

        const booking = await Booking.findOne({
            $or: [{ _id: id }, { bookingId: id }],
            mentor: mentor._id,
            status: { $in: ['in_progress', 'completed'] }
        });

        if (!booking) {
            sendError(res, 'Booking not found', 404);
            return;
        }

        booking.sessionNotes = { content, updatedAt: new Date() };
        await booking.save();

        sendSuccess(res, { sessionNotes: booking.sessionNotes }, 'Session notes saved');
    } catch (error) {
        console.error('[addSessionNotes]', error);
        sendError(res, 'Failed to save session notes', 500, error);
    }
};

// ==================== GET MENTOR UPCOMING BOOKINGS ====================

/**
 * GET /api/bookings/mentor/upcoming
 * Returns upcoming confirmed bookings for the authenticated mentor.
 */
export const getMentorUpcomingBookings = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const mentor = req.mentor!;
        const limit = Math.min(20, parseInt(req.query.limit as string) || 10);

        const bookings = await Booking.find({
            mentor: mentor._id,
            status: { $in: ['confirmed', 'in_progress'] },
            scheduledAt: { $gte: new Date() }
        })
            .populate('student', 'name avatar email')
            .sort({ scheduledAt: 1 })
            .limit(limit);

        sendSuccess(res, { bookings });
    } catch (error) {
        console.error('[getMentorUpcomingBookings]', error);
        sendError(res, 'Failed to fetch upcoming bookings', 500, error);
    }
};
