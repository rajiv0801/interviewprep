import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { mentorOnly } from '../middleware/mentorMiddleware';
import { validate } from '../middleware/validation';
import {
    createBooking,
    getUserBookings,
    getBooking,
    cancelBooking,
    startSession,
    completeSession,
    submitReview,
    addSessionNotes,
    getMentorUpcomingBookings
} from '../controller/bookingController';
import {
    createBookingSchema,
    cancelBookingSchema,
    submitReviewSchema,
    addSessionNotesSchema,
    getUserBookingsSchema
} from '../validator/bookingValidator';

const bookingRouter = Router();

// ==================== STUDENT ROUTES ====================

// Create a new booking (returns Razorpay order)
bookingRouter.post('/', protect, validate(createBookingSchema), createBooking);

// List own bookings (as student or mentor)
bookingRouter.get('/', protect, validate(getUserBookingsSchema), getUserBookings);

// Get a single booking by ID or bookingId
bookingRouter.get('/:id', protect, getBooking);

// Cancel a booking
bookingRouter.put('/:id/cancel', protect, validate(cancelBookingSchema), cancelBooking);

// Submit a review after session
bookingRouter.post('/:id/review', protect, validate(submitReviewSchema), submitReview);

// ==================== MENTOR ROUTES ====================

// Get upcoming bookings for mentor dashboard
bookingRouter.get('/mentor/upcoming', protect, mentorOnly, getMentorUpcomingBookings);

// Start a session (generates Jitsi room)
bookingRouter.put('/:id/start', protect, mentorOnly, startSession);

// Mark session as completed
bookingRouter.put('/:id/complete', protect, mentorOnly, completeSession);

// Add session notes
bookingRouter.put('/:id/notes', protect, mentorOnly, validate(addSessionNotesSchema), addSessionNotes);

export default bookingRouter;
