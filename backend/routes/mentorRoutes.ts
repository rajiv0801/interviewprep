import { Router } from 'express';
import { protect, optionalAuth, adminOnly } from '../middleware/authMiddleware';
import { mentorOnly } from '../middleware/mentorMiddleware';
import { validate } from '../middleware/validation';
import {
    applyAsMentor,
    listMentors,
    getMentorProfile,
    getMyMentorProfile,
    updateMentorProfile,
    updateAvailability,
    toggleBookings,
    updatePayoutDetails,
    getMentorDashboardStats,
    getMentorReviews,
    replyToReview,
    listMentorApplications,
    approveMentor,
    rejectMentor
} from '../controller/mentorController';
import {
    mentorApplicationSchema,
    updateMentorProfileSchema,
    updateAvailabilitySchema,
    updatePayoutDetailsSchema,
    listMentorsSchema,
    getMentorReviewsSchema,
    adminMentorActionSchema
} from '../validator/mentorValidator';

const mentorRouter = Router();

// ==================== PUBLIC / STUDENT ROUTES ====================

// Browse approved mentors
mentorRouter.get('/', optionalAuth, validate(listMentorsSchema), listMentors);

// Apply to become a mentor
mentorRouter.post('/apply', protect, validate(mentorApplicationSchema), applyAsMentor);

// ==================== MENTOR SELF-MANAGEMENT ROUTES ====================

// Get own full profile (with payout details)
mentorRouter.get('/me', protect, mentorOnly, getMyMentorProfile);

// Update own profile
mentorRouter.put('/profile', protect, mentorOnly, validate(updateMentorProfileSchema), updateMentorProfile);

// Update weekly availability
mentorRouter.put('/availability', protect, mentorOnly, validate(updateAvailabilitySchema), updateAvailability);

// Toggle accepting bookings on/off
mentorRouter.put('/toggle-bookings', protect, mentorOnly, toggleBookings);

// Update payout details (bank/UPI)
mentorRouter.put('/payout-details', protect, mentorOnly, validate(updatePayoutDetailsSchema), updatePayoutDetails);

// Dashboard stats
mentorRouter.get('/dashboard/stats', protect, mentorOnly, getMentorDashboardStats);

// Reply to a review
mentorRouter.post('/reviews/:reviewId/reply', protect, mentorOnly, replyToReview);

// ==================== ADMIN ROUTES ====================

// List mentor applications (admin only)
mentorRouter.get('/admin/applications', protect, adminOnly, listMentorApplications);

// Approve a mentor application
mentorRouter.put('/admin/:id/approve', protect, adminOnly, validate(adminMentorActionSchema), approveMentor);

// Reject a mentor application
mentorRouter.put('/admin/:id/reject', protect, adminOnly, validate(adminMentorActionSchema), rejectMentor);

// ==================== PUBLIC PROFILE ROUTES ====================

// Get mentor reviews (paginated)
mentorRouter.get('/:id/reviews', optionalAuth, validate(getMentorReviewsSchema), getMentorReviews);

// Get mentor public profile by slug or ID (must be last to avoid conflicts)
mentorRouter.get('/:slug', optionalAuth, getMentorProfile);

export default mentorRouter;
