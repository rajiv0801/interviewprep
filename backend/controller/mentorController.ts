import { Response, NextFunction } from 'express';
import { SortOrder } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { MentorRequest } from '../middleware/mentorMiddleware';
import Mentor from '../models/mentor';
import MentorReview from '../models/mentorReview';
import Booking from '../models/booking';
import User from '../models/user';
import mentorEmailService from '../services/mentorEmailService';
import notificationService from '../services/notificationService';

// ==================== HELPERS ====================

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

const generateSlug = (name: string, id: string): string => {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    return `${base}-${id.slice(-6)}`;
};

// ==================== APPLY AS MENTOR ====================

/**
 * POST /api/mentors/apply
 * Creates a new mentor profile for the authenticated user.
 */
export const applyAsMentor = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;

        // Check if already applied
        if (user.mentorProfile) {
            const existing = await Mentor.findById(user.mentorProfile);
            if (existing) {
                sendError(res, `You already have a mentor profile (status: ${existing.applicationStatus})`, 409);
                return;
            }
        }

        const {
            headline, bio, expertise, sessionTopics, languages,
            experience, availability, timezone, pricing, linkedinUrl, avatar
        } = req.body;

        // Generate unique slug
        const slug = generateSlug(user.name, user._id.toString());

        const mentor = await Mentor.create({
            user: user._id,
            slug,
            headline,
            bio,
            expertise,
            sessionTopics: sessionTopics || [],
            languages: languages || [],
            experience: experience || { pastCompanies: [] },
            availability: availability || [],
            timezone: timezone || 'Asia/Kolkata',
            pricing,
            linkedinUrl,
            avatar: avatar || user.avatar,
            applicationStatus: 'pending',
            isAcceptingBookings: false
        });

        // Link mentor profile to user
        await User.findByIdAndUpdate(user._id, { mentorProfile: mentor._id });

        sendSuccess(res, { mentor }, 'Mentor application submitted successfully. You will be notified once reviewed.', 201);
    } catch (error) {
        console.error('[applyAsMentor]', error);
        sendError(res, 'Failed to submit mentor application', 500, error);
    }
};

// ==================== LIST MENTORS ====================

/**
 * GET /api/mentors
 * Returns paginated, filtered list of approved mentors.
 */
export const listMentors = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const {
            expertise, sessionTopic, company, priceMin, priceMax,
            rating, duration, sort = 'rating', page = 1, limit = 12
        } = req.query as Record<string, string>;

        const filter: Record<string, unknown> = {
            applicationStatus: 'approved',
            verified: true,
            isActive: true,
            isAcceptingBookings: true
        };

        if (expertise) filter.expertise = expertise;
        if (sessionTopic) filter.sessionTopics = sessionTopic;
        if (company) {
            filter['experience.currentCompany'] = { $regex: company, $options: 'i' };
        }
        if (rating) filter['rating.average'] = { $gte: parseFloat(rating) };

        // Price filter based on duration
        if (priceMin || priceMax) {
            const priceField = duration === '60' ? 'pricing.sixtyMin' : 'pricing.thirtyMin';
            const priceFilter: Record<string, number> = {};
            if (priceMin) priceFilter.$gte = parseInt(priceMin);
            if (priceMax) priceFilter.$lte = parseInt(priceMax);
            filter[priceField] = priceFilter;
        }

        // Sort options
        const sortMap: Record<string, Record<string, SortOrder>> = {
            rating: { 'rating.average': -1, 'rating.count': -1 },
            price_asc: { 'pricing.thirtyMin': 1 },
            price_desc: { 'pricing.thirtyMin': -1 },
            sessions: { totalSessions: -1 },
            newest: { createdAt: -1 }
        };
        const sortOption = sortMap[sort] || sortMap.rating;

        const pageNum = Math.max(1, parseInt(page as string));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
        const skip = (pageNum - 1) * limitNum;

        const [mentors, total] = await Promise.all([
            Mentor.find(filter)
                .populate('user', 'name avatar')
                .sort(sortOption)
                .skip(skip)
                .limit(limitNum)
                .select('-payoutDetails -applicationNote'),
            Mentor.countDocuments(filter)
        ]);

        sendSuccess(res, {
            mentors,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('[listMentors]', error);
        sendError(res, 'Failed to fetch mentors', 500, error);
    }
};

// ==================== GET MENTOR PROFILE ====================

/**
 * GET /api/mentors/:slug
 * Returns a single mentor's public profile.
 */
export const getMentorProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { slug } = req.params;

        const slugStr = String(slug);
        const isObjectId = /^[a-f\d]{24}$/i.test(slugStr);

        const mentor = await Mentor.findOne({
            $or: [{ slug: slugStr }, ...(isObjectId ? [{ _id: slugStr }] : [])],
            applicationStatus: 'approved',
            isActive: true
        })
            .populate('user', 'name avatar email')
            .select('-payoutDetails -applicationNote');

        if (!mentor) {
            sendError(res, 'Mentor not found', 404);
            return;
        }

        sendSuccess(res, { mentor });
    } catch (error) {
        console.error('[getMentorProfile]', error);
        sendError(res, 'Failed to fetch mentor profile', 500, error);
    }
};

// ==================== GET OWN MENTOR PROFILE ====================

/**
 * GET /api/mentors/me
 * Returns the authenticated mentor's own full profile.
 */
export const getMyMentorProfile = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const mentor = await Mentor.findById(req.mentor!._id)
            .populate('user', 'name avatar email');

        sendSuccess(res, { mentor });
    } catch (error) {
        console.error('[getMyMentorProfile]', error);
        sendError(res, 'Failed to fetch mentor profile', 500, error);
    }
};

// ==================== UPDATE MENTOR PROFILE ====================

/**
 * PUT /api/mentors/profile
 * Updates the authenticated mentor's profile.
 */
export const updateMentorProfile = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const allowedFields = [
            'headline', 'bio', 'expertise', 'sessionTopics', 'languages',
            'experience', 'timezone', 'pricing', 'linkedinUrl', 'avatar'
        ];

        const updates: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const mentor = await Mentor.findByIdAndUpdate(
            req.mentor!._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).populate('user', 'name avatar');

        sendSuccess(res, { mentor }, 'Profile updated successfully');
    } catch (error) {
        console.error('[updateMentorProfile]', error);
        sendError(res, 'Failed to update profile', 500, error);
    }
};

// ==================== UPDATE AVAILABILITY ====================

/**
 * PUT /api/mentors/availability
 * Replaces the mentor's weekly availability slots.
 */
export const updateAvailability = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { availability } = req.body;

        const mentor = await Mentor.findByIdAndUpdate(
            req.mentor!._id,
            { $set: { availability } },
            { new: true, runValidators: true }
        );

        sendSuccess(res, { availability: mentor?.availability }, 'Availability updated successfully');
    } catch (error) {
        console.error('[updateAvailability]', error);
        sendError(res, 'Failed to update availability', 500, error);
    }
};

// ==================== TOGGLE ACCEPTING BOOKINGS ====================

/**
 * PUT /api/mentors/toggle-bookings
 * Toggles whether the mentor is accepting new bookings.
 */
export const toggleBookings = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const mentor = req.mentor!;
        const newStatus = !mentor.isAcceptingBookings;

        await Mentor.findByIdAndUpdate(mentor._id, { isAcceptingBookings: newStatus });

        sendSuccess(
            res,
            { isAcceptingBookings: newStatus },
            `You are now ${newStatus ? 'accepting' : 'not accepting'} new bookings`
        );
    } catch (error) {
        console.error('[toggleBookings]', error);
        sendError(res, 'Failed to update booking status', 500, error);
    }
};

// ==================== UPDATE PAYOUT DETAILS ====================

/**
 * PUT /api/mentors/payout-details
 * Updates the mentor's payout information.
 */
export const updatePayoutDetails = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { method, upiId, bankAccount } = req.body;

        const mentor = await Mentor.findByIdAndUpdate(
            req.mentor!._id,
            { $set: { payoutDetails: { method, upiId, bankAccount } } },
            { new: true }
        );

        sendSuccess(res, { payoutDetails: mentor?.payoutDetails }, 'Payout details updated');
    } catch (error) {
        console.error('[updatePayoutDetails]', error);
        sendError(res, 'Failed to update payout details', 500, error);
    }
};

// ==================== MENTOR DASHBOARD STATS ====================

/**
 * GET /api/mentors/dashboard/stats
 * Returns the mentor's dashboard statistics.
 */
export const getMentorDashboardStats = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const mentor = req.mentor!;

        // Get review stats
        const reviewStats = await MentorReview.aggregate([
            { $match: { mentor: mentor._id } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    ratingBreakdown: {
                        $push: '$rating'
                    }
                }
            }
        ]);

        const stats = {
            totalSessions: mentor.totalSessions,
            totalEarnings: mentor.totalEarnings,
            rating: mentor.rating,
            cancellationRate: mentor.cancellationRate,
            repeatStudentRate: mentor.repeatStudentRate,
            isAcceptingBookings: mentor.isAcceptingBookings,
            applicationStatus: mentor.applicationStatus,
            reviews: reviewStats[0] || { avgRating: 0, totalReviews: 0 }
        };

        sendSuccess(res, { stats });
    } catch (error) {
        console.error('[getMentorDashboardStats]', error);
        sendError(res, 'Failed to fetch dashboard stats', 500, error);
    }
};

// ==================== GET MENTOR REVIEWS ====================

/**
 * GET /api/mentors/:id/reviews
 * Returns paginated public reviews for a mentor.
 */
export const getMentorReviews = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
        const skip = (page - 1) * limit;

        const filter = { mentor: id, isPublic: true, isReported: false };

        const [reviews, total] = await Promise.all([
            MentorReview.find(filter)
                .populate('student', 'name avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            MentorReview.countDocuments(filter)
        ]);

        sendSuccess(res, {
            reviews,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[getMentorReviews]', error);
        sendError(res, 'Failed to fetch reviews', 500, error);
    }
};

// ==================== MENTOR REPLY TO REVIEW ====================

/**
 * POST /api/mentors/reviews/:reviewId/reply
 * Allows a mentor to reply to a review on their profile.
 */
export const replyToReview = async (
    req: MentorRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { reviewId } = req.params;
        const { content } = req.body;

        const review = await MentorReview.findOne({
            _id: reviewId,
            mentor: req.mentor!._id
        });

        if (!review) {
            sendError(res, 'Review not found', 404);
            return;
        }

        if (review.mentorReply?.content) {
            sendError(res, 'You have already replied to this review', 409);
            return;
        }

        review.mentorReply = { content, repliedAt: new Date() };
        await review.save();

        sendSuccess(res, { review }, 'Reply added successfully');
    } catch (error) {
        console.error('[replyToReview]', error);
        sendError(res, 'Failed to add reply', 500, error);
    }
};

// ==================== ADMIN: LIST APPLICATIONS ====================

/**
 * GET /api/admin/mentor-applications
 * Admin only: lists pending mentor applications.
 */
export const listMentorApplications = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const status = (req.query.status as string) || 'pending';
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
        const skip = (page - 1) * limit;

        const [applications, total] = await Promise.all([
            Mentor.find({ applicationStatus: status })
                .populate('user', 'name email avatar createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Mentor.countDocuments({ applicationStatus: status })
        ]);

        sendSuccess(res, {
            applications,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[listMentorApplications]', error);
        sendError(res, 'Failed to fetch applications', 500, error);
    }
};

// ==================== ADMIN: APPROVE MENTOR ====================

/**
 * PUT /api/admin/mentors/:id/approve
 * Admin only: approves a mentor application.
 */
export const approveMentor = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const mentor = await Mentor.findByIdAndUpdate(
            id,
            {
                $set: {
                    applicationStatus: 'approved',
                    verified: true,
                    verifiedAt: new Date(),
                    isAcceptingBookings: true,
                    applicationNote: note
                }
            },
            { new: true }
        ).populate('user', 'name email');

        if (!mentor) {
            sendError(res, 'Mentor not found', 404);
            return;
        }

        // Send approval email + notification
        const mentorUser = mentor.user as unknown as { name: string; email: string; _id: string };
        if (mentorUser?.email) {
            mentorEmailService.sendMentorApproved({
                mentorEmail: mentorUser.email,
                mentorName: mentorUser.name
            }).catch(err => console.error('[approveMentor] email error:', err));
        }
        notificationService.create({
            userId: mentorUser._id?.toString(),
            type: 'mentor_approved',
            title: 'Application Approved! 🎉',
            message: 'Congratulations! You are now an approved mentor on Graphora.',
            actionUrl: '/mentor/dashboard'
        }).catch(() => { });

        sendSuccess(res, { mentor }, 'Mentor approved successfully');
    } catch (error) {
        console.error('[approveMentor]', error);
        sendError(res, 'Failed to approve mentor', 500, error);
    }
};

// ==================== ADMIN: REJECT MENTOR ====================

/**
 * PUT /api/admin/mentors/:id/reject
 * Admin only: rejects a mentor application.
 */
export const rejectMentor = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const mentor = await Mentor.findByIdAndUpdate(
            id,
            {
                $set: {
                    applicationStatus: 'rejected',
                    applicationNote: note
                }
            },
            { new: true }
        ).populate('user', 'name email');

        if (!mentor) {
            sendError(res, 'Mentor not found', 404);
            return;
        }

        // Send rejection email + notification
        const mentorUser = mentor.user as unknown as { name: string; email: string; _id: string };
        if (mentorUser?.email) {
            mentorEmailService.sendMentorRejected({
                mentorEmail: mentorUser.email,
                mentorName: mentorUser.name,
                reason: note
            }).catch(err => console.error('[rejectMentor] email error:', err));
        }
        notificationService.create({
            userId: mentorUser._id?.toString(),
            type: 'mentor_rejected',
            title: 'Application Update',
            message: note || 'Your mentor application was not approved at this time.',
            actionUrl: '/mentors/apply'
        }).catch(() => { });

        sendSuccess(res, { mentor }, 'Mentor application rejected');
    } catch (error) {
        console.error('[rejectMentor]', error);
        sendError(res, 'Failed to reject mentor', 500, error);
    }
};

// ==================== ADMIN: REVENUE STATS ====================

/**
 * GET /api/admin/revenue
 * Admin only: returns aggregated revenue statistics.
 */
export const getAdminRevenue = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [totalRevenue, monthlyRevenue, lastMonthRevenue, totalBookings, completedBookings] = await Promise.all([
            // Total revenue (all time)
            Booking.aggregate([
                { $match: { 'payment.status': 'paid' } },
                { $group: { _id: null, total: { $sum: '$payment.amount' } } }
            ]),
            // This month
            Booking.aggregate([
                { $match: { 'payment.status': 'paid', 'payment.paidAt': { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$payment.amount' } } }
            ]),
            // Last month
            Booking.aggregate([
                { $match: { 'payment.status': 'paid', 'payment.paidAt': { $gte: startOfLastMonth, $lt: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$payment.amount' } } }
            ]),
            // Total bookings
            Booking.countDocuments(),
            // Completed bookings
            Booking.countDocuments({ status: 'completed' })
        ]);

        // Revenue by month (last 6 months)
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const revenueByMonth = await Booking.aggregate([
            { $match: { 'payment.status': 'paid', 'payment.paidAt': { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$payment.paidAt' } },
                    total: { $sum: '$payment.amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Top earners
        const topMentors = await Booking.aggregate([
            { $match: { 'payment.status': 'paid' } },
            { $group: { _id: '$mentor', totalEarnings: { $sum: '$payment.amount' }, sessions: { $sum: 1 } } },
            { $sort: { totalEarnings: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'mentors', localField: '_id', foreignField: '_id', as: 'mentor' } },
            { $unwind: '$mentor' },
            { $lookup: { from: 'users', localField: 'mentor.user', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', totalEarnings: 1, sessions: 1 } }
        ]);

        const platformFeeRate = parseFloat(process.env.PLATFORM_FEE_PERCENT || '15') / 100;
        const totalRevenueAmount = totalRevenue[0]?.total || 0;
        const platformEarnings = Math.round(totalRevenueAmount * platformFeeRate);

        sendSuccess(res, {
            totalRevenue: totalRevenueAmount,
            platformEarnings,
            platformFeeRate: platformFeeRate * 100,
            thisMonth: monthlyRevenue[0]?.total || 0,
            lastMonth: lastMonthRevenue[0]?.total || 0,
            totalBookings,
            completedBookings,
            revenueByMonth,
            topMentors
        }, 'Revenue stats fetched');
    } catch (error) {
        console.error('[getAdminRevenue]', error);
        sendError(res, 'Failed to fetch revenue', 500, error);
    }
};
