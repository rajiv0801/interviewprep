import { z } from 'zod';

// ==================== ENUMS ====================

const expertiseEnum = ['DSA', 'System Design', 'Frontend', 'Backend', 'ML/AI', 'DevOps', 'Mobile'] as const;

const sessionTopicEnum = [
    'DSA Problem Solving', 'System Design', 'Resume Review',
    'Mock Interview', 'Career Guidance', 'Frontend Development',
    'Backend Development', 'ML/AI Guidance'
] as const;

// ==================== AVAILABILITY ====================

const timeSlotSchema = z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
});

const availabilitySchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    slots: z.array(timeSlotSchema).min(1).max(8)
});

// ==================== MENTOR APPLICATION ====================

export const mentorApplicationSchema = z.object({
    body: z.object({
        headline: z.string().min(10).max(150),
        bio: z.string().min(50).max(2000),
        expertise: z.array(z.enum(expertiseEnum)).min(1).max(5),
        sessionTopics: z.array(z.enum(sessionTopicEnum)).min(1).max(8),
        languages: z.array(z.string().min(1).max(50)).min(1).max(10),
        experience: z.object({
            years: z.number().int().min(0).max(50).optional(),
            currentCompany: z.string().max(100).optional(),
            currentRole: z.string().max(100).optional(),
            pastCompanies: z.array(z.string().max(100)).max(10).default([])
        }),
        availability: z.array(availabilitySchema).min(1).max(7),
        timezone: z.string().default('Asia/Kolkata'),
        pricing: z.object({
            thirtyMin: z.number().int().min(100).max(50000).optional(),
            sixtyMin: z.number().int().min(200).max(100000).optional(),
            currency: z.string().default('INR')
        }).refine(
            (p) => p.thirtyMin !== undefined || p.sixtyMin !== undefined,
            { message: 'At least one pricing option (30min or 60min) is required' }
        ),
        linkedinUrl: z.string().url().optional().or(z.literal('')),
        avatar: z.string().url().optional()
    })
});

// ==================== UPDATE MENTOR PROFILE ====================

export const updateMentorProfileSchema = z.object({
    body: z.object({
        headline: z.string().min(10).max(150).optional(),
        bio: z.string().min(50).max(2000).optional(),
        expertise: z.array(z.enum(expertiseEnum)).min(1).max(5).optional(),
        sessionTopics: z.array(z.enum(sessionTopicEnum)).min(1).max(8).optional(),
        languages: z.array(z.string().min(1).max(50)).min(1).max(10).optional(),
        experience: z.object({
            years: z.number().int().min(0).max(50).optional(),
            currentCompany: z.string().max(100).optional(),
            currentRole: z.string().max(100).optional(),
            pastCompanies: z.array(z.string().max(100)).max(10).optional()
        }).optional(),
        timezone: z.string().optional(),
        pricing: z.object({
            thirtyMin: z.number().int().min(100).max(50000).optional(),
            sixtyMin: z.number().int().min(200).max(100000).optional(),
            currency: z.string().optional()
        }).optional(),
        linkedinUrl: z.string().url().optional().or(z.literal('')),
        avatar: z.string().url().optional()
    })
});

// ==================== UPDATE AVAILABILITY ====================

export const updateAvailabilitySchema = z.object({
    body: z.object({
        availability: z.array(availabilitySchema).min(0).max(7)
    })
});

// ==================== UPDATE PAYOUT DETAILS ====================

export const updatePayoutDetailsSchema = z.object({
    body: z.object({
        method: z.enum(['bank_transfer', 'upi']),
        upiId: z.string().min(5).max(50).optional(),
        bankAccount: z.object({
            accountNumber: z.string().min(8).max(20),
            ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
            accountHolder: z.string().min(2).max(100)
        }).optional()
    }).refine(
        (d) => {
            if (d.method === 'upi') return !!d.upiId;
            if (d.method === 'bank_transfer') return !!d.bankAccount;
            return true;
        },
        { message: 'UPI ID required for UPI method; bank account required for bank transfer' }
    )
});

// ==================== LIST MENTORS ====================

export const listMentorsSchema = z.object({
    query: z.object({
        expertise: z.enum(expertiseEnum).optional(),
        sessionTopic: z.enum(sessionTopicEnum).optional(),
        company: z.string().max(100).optional(),
        priceMin: z.coerce.number().int().min(0).optional(),
        priceMax: z.coerce.number().int().min(0).optional(),
        rating: z.coerce.number().min(0).max(5).optional(),
        duration: z.enum(['30', '60']).optional(),
        sort: z.enum(['rating', 'price_asc', 'price_desc', 'sessions', 'newest']).default('rating'),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(12)
    })
});

// ==================== GET MENTOR REVIEWS ====================

export const getMentorReviewsSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(20).default(10)
    })
});

// ==================== ADMIN MENTOR ACTIONS ====================

export const adminMentorActionSchema = z.object({
    params: z.object({
        id: z.string().min(1)
    }),
    body: z.object({
        note: z.string().max(500).optional()
    }).default({})
});
