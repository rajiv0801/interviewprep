import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import Mentor from '../models/mentor';
import { IMentor } from '../types/type';

// Extend AuthenticatedRequest to include mentor
export interface MentorRequest extends AuthenticatedRequest {
    mentor?: IMentor;
}

/**
 * Middleware: requires the authenticated user to be an approved mentor.
 * Must be used AFTER protect middleware.
 * Attaches the mentor document to req.mentor.
 */
export const mentorOnly = async (
    req: MentorRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }

        if (!req.user.mentorProfile) {
            res.status(403).json({
                success: false,
                message: 'Mentor profile not found. Please apply to become a mentor.'
            });
            return;
        }

        const mentor = await Mentor.findById(req.user.mentorProfile);

        if (!mentor) {
            res.status(403).json({
                success: false,
                message: 'Mentor profile not found.'
            });
            return;
        }

        if (!mentor.isActive) {
            res.status(403).json({
                success: false,
                message: 'Your mentor account has been deactivated.'
            });
            return;
        }

        if (mentor.applicationStatus !== 'approved') {
            res.status(403).json({
                success: false,
                message: mentor.applicationStatus === 'pending'
                    ? 'Your mentor application is under review. Please wait for approval.'
                    : 'Your mentor application was not approved.'
            });
            return;
        }

        req.mentor = mentor;
        next();
    } catch (error) {
        console.error('[mentorOnly] Error:', error);
        res.status(500).json({ success: false, message: 'Authorization error' });
    }
};

/**
 * Middleware: allows access if user is an approved mentor OR an admin.
 * Must be used AFTER protect middleware.
 */
export const mentorOrAdmin = async (
    req: MentorRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
    }

    // Admins always pass
    if (req.user.role === 'admin') {
        next();
        return;
    }

    // Otherwise check mentor status
    await mentorOnly(req, res, next);
};
