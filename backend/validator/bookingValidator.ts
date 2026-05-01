import { z } from 'zod';

// ==================== CREATE BOOKING ====================

export const createBookingSchema = z.object({
    body: z.object({
        mentorId: z.string().min(1, 'Mentor ID is required'),
        scheduledAt: z.string().datetime({ message: 'scheduledAt must be a valid ISO datetime' }),
        duration: z.union([z.literal(30), z.literal(60)]),
        type: z.enum(['video', 'chat']).default('video'),
        topic: z.string().min(3).max(200).optional(),
        agenda: z.string().max(1000).optional(),
        timezone: z.string().default('Asia/Kolkata')
    })
});

// ==================== CANCEL BOOKING ====================

export const cancelBookingSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: z.object({
        reason: z.string().min(5).max(500)
    })
});

// ==================== SUBMIT REVIEW ====================

export const submitReviewSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: z.object({
        rating: z.number().int().min(1).max(5),
        review: z.string().min(10).max(1000).optional()
    })
});

// ==================== ADD SESSION NOTES ====================

export const addSessionNotesSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: z.object({
        content: z.string().min(1).max(5000)
    })
});

// ==================== GET USER BOOKINGS ====================

export const getUserBookingsSchema = z.object({
    query: z.object({
        status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
        role: z.enum(['student', 'mentor']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10)
    })
});

// ==================== MENTOR REPLY TO REVIEW ====================

export const mentorReplySchema = z.object({
    params: z.object({
        reviewId: z.string().min(1)
    }),
    body: z.object({
        content: z.string().min(5).max(500)
    })
});
