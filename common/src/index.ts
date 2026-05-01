import { z } from 'zod';

const languagesEnum = ['JavaScript', 'Python', 'Java', 'C++', 'C', 'C#', 'Go', 'Ruby', 'Swift'] as const;
const levelEnum = ['beginner', 'intermediate', 'advanced'] as const;
const difficultyEnum = ['easy', 'medium', 'hard', 'mixed'] as const;

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email');

const urlSchema = z
    .string()
    .url('Please provide a valid URL')
    .or(z.literal(''))
    .optional();

export const registerSchema = z.object({
    body: z.object({
        name: z
            .string()
            .trim()
            .min(2, 'Name must be at least 2 characters')
            .max(50, 'Name cannot exceed 50 characters'),
        username: z
            .string()
            .trim()
            .toLowerCase()
            .min(3, 'Username must be at least 3 characters')
            .max(30, 'Username cannot exceed 30 characters')
            .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
        email: emailSchema,
        password: passwordSchema,
        passwordConfirm: z.string(),
        age: z
            .number()
            .int()
            .min(13, 'You must be at least 13 years old')
            .max(100, 'Please enter a valid age')
            .optional(),
        college: z
            .string()
            .trim()
            .max(100, 'College name cannot exceed 100 characters')
            .optional(),
        level: z.enum(levelEnum).default('beginner').optional(),
        languages: z.array(z.enum(languagesEnum)).optional(),
        preferredDifficulty: z.enum(difficultyEnum).default('mixed').optional(),
        preferredCompanies: z.array(z.string()).optional(),
        preferredDomains: z.array(z.string()).optional(),
        github: urlSchema,
        linkedin: urlSchema,
        portfolio: urlSchema
    }).refine((data) => data.password === data.passwordConfirm, {
        message: "Passwords don't match",
        path: ['passwordConfirm']
    })
});

export const loginSchema = z.object({
    body: z.object({
        emailOrUsername: z
            .string()
            .trim()
            .min(1, 'Email or username is required'),
        password: z
            .string()
            .min(1, 'Password is required')
    })
});

export const verifyOTPSchema = z.object({
    body: z.object({
        email: emailSchema,
        otp: z
            .string()
            .length(6, 'OTP must be 6 digits')
            .regex(/^\d+$/, 'OTP must contain only numbers')
    })
});

export const resendOTPSchema = z.object({
    body: z.object({
        email: emailSchema
    })
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: emailSchema
    })
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Token is required'),
        password: passwordSchema,
        passwordConfirm: z.string()
    }).refine((data) => data.password === data.passwordConfirm, {
        message: "Passwords don't match",
        path: ['passwordConfirm']
    })
});

export const updateProfileSchema = z.object({
    body: z.object({
        name: z
            .string()
            .trim()
            .min(2, 'Name must be at least 2 characters')
            .max(50, 'Name cannot exceed 50 characters')
            .optional(),
        bio: z
            .string()
            .trim()
            .max(500, 'Bio cannot exceed 500 characters')
            .optional(),
        age: z
            .number()
            .int()
            .min(13, 'You must be at least 13 years old')
            .max(100, 'Please enter a valid age')
            .optional(),
        college: z
            .string()
            .trim()
            .max(100, 'College name cannot exceed 100 characters')
            .optional(),
        level: z.enum(levelEnum).optional(),
        languages: z.array(z.enum(languagesEnum)).optional(),
        preference: z.object({
            difficulty: z.enum(difficultyEnum).optional(),
            companies: z.array(z.string()).optional(),
            domains: z.array(z.string()).optional()
        }).optional(),
        socialLinks: z.object({
            github: urlSchema,
            linkedin: urlSchema,
            portfolio: urlSchema
        }).optional(),
        codingProfiles: z.object({
            leetcode: z.string().trim().optional(),
            gfg: z.string().trim().optional(),
            codeforces: z.string().trim().optional(),
            codechef: z.string().trim().optional(),
            github: z.string().trim().optional()
        }).optional()
    })
});

export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z
            .string()
            .min(1, 'Current password is required'),
        newPassword: passwordSchema,
        confirmPassword: z.string()
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    })
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>['body'];
export type ResendOTPInput = z.infer<typeof resendOTPSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
