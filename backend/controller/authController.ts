import { Request, Response, CookieOptions } from 'express';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import User from '../models/user';
import emailService from '../services/emailService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { IUser, UserLevel, ProgrammingLanguage } from '../types/type';


interface RegisterBody {
    name: string;
    username: string;
    email: string;
    password: string;
    passwordConfirm?: string;
    age?: number;
    college?: string;
    level?: UserLevel;
    languages?: ProgrammingLanguage[];
    github?: string;
    linkedin?: string;
    portfolio?: string;
}

interface LoginBody {
    emailOrUsername: string;
    password: string;
}

interface VerifyOTPBody {
    email: string;
    otp: string;
}

interface ResendOTPBody {
    email: string;
}

interface ChangePasswordBody {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface UpdateProfileBody {
    name?: string;
    bio?: string;
    age?: number;
    college?: string;
    level?: UserLevel;
    languages?: ProgrammingLanguage[];
    avatar?: string;
    timezone?: string;
    socialLinks?: {
        github?: string;
        linkedin?: string;
        portfolio?: string;
    };
    preference?: {
        difficulty?: string;
        companies?: string[];
        domains?: string[];
    };
}

interface ForgotPasswordBody {
    email: string;
}

interface ResetPasswordBody {
    token: string;
    password: string;
    passwordConfirm: string;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    token?: string;
    error?: string;
}

const config = {
    jwt: {
        secret: process.env.JWT_KEY || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    },
    cookie: {
        expiresDays: 30
    },
    env: process.env.NODE_ENV || 'development',
    passwordReset: {
        expiresIn: 60 * 60 * 1000
    }
};


const signToken = (id: string): string => {
    const secret: jwt.Secret = config.jwt.secret;
    return jwt.sign({ id }, secret, {
        expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn']
    });
};

const getCookieOptions = (): CookieOptions => ({
    expires: new Date(Date.now() + config.cookie.expiresDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'strict' : 'lax'
});

const sanitizeUser = (user: IUser): Partial<IUser> => {
    const userObj = user.toObject();
    const sensitiveFields = ['password', 'otp', 'otpExpiry', 'passwordResetToken', 'passwordResetExpires', '__v'];
    sensitiveFields.forEach(field => delete userObj[field]);
    return userObj;
};

const createSendToken = (user: IUser, statusCode: number, res: Response): void => {
    const token = signToken(user._id.toString());

    res.cookie('token', token, getCookieOptions());

    const response: ApiResponse<{ user: Partial<IUser> }> = {
        success: true,
        token,
        data: { user: sanitizeUser(user) }
    };

    res.status(statusCode).json(response);
};

const sendResponse = <T>(res: Response, statusCode: number, data: ApiResponse<T>): void => {
    res.status(statusCode).json(data);
};

const sendError = (res: Response, statusCode: number, message: string): void => {
    sendResponse(res, statusCode, { success: false, message });
};

const handleError = (error: unknown, res: Response, context: string): void => {
    console.error(`[${context}] Error:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (error instanceof Error && error.message.includes('duplicate key')) {
        sendError(res, 409, 'A user with this email or username already exists');
        return;
    }

    if (error instanceof Error && error.name === 'ValidationError') {
        sendError(res, 400, errorMessage);
        return;
    }

    sendResponse(res, 500, {
        success: false,
        message: `Error in ${context}`,
        error: config.env === 'development' ? errorMessage : undefined
    });
};


export const register = async (
    req: Request<object, object, RegisterBody>,
    res: Response
): Promise<void> => {
    try {
        const {
            name,
            username,
            email,
            password,
            age,
            college,
            level,
            languages,
            github,
            linkedin,
            portfolio
        } = req.body;

        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: username.toLowerCase() }
            ]
        });

        if (existingUser) {
            const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
            sendError(res, 409, `User with this ${field} already exists`);
            return;
        }

        const newUser = new User({
            name: name.trim(),
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
            password,
            age,
            college: college?.trim(),
            level: level || 'beginner',
            languages: languages || [],
            isEmailVerified: false,
            socialLinks: {
                github: github?.trim() || '',
                linkedin: linkedin?.trim() || '',
                portfolio: portfolio?.trim() || ''
            }
        });

        const otp = newUser.generateOTP();
        await newUser.save();

        emailService.sendOTP(email, otp, name).catch(err => {
            console.warn(`[register] Failed to send OTP email: ${err}`);
        });

        if (config.env === 'development') {
            console.log(`[DEV] OTP for ${email}: ${otp}`);
        }

        sendResponse(res, 201, {
            success: true,
            message: 'Registration successful. Please verify your email with the OTP sent.',
            data: {
                email: newUser.email,
                username: newUser.username || '',
                otpExpiresIn: '10 minutes'
            }
        });
    } catch (error) {
        handleError(error, res, 'register');
    }
};

export const verifyOTP = async (
    req: Request<object, object, VerifyOTPBody>,
    res: Response
): Promise<void> => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpiry');

        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        if (user.isEmailVerified) {
            sendError(res, 400, 'Email is already verified');
            return;
        }

        if (!user.verifyOTP(otp)) {
            sendError(res, 400, 'Invalid or expired OTP');
            return;
        }

        user.clearOTP();
        user.isEmailVerified = true;
        await user.save();

        emailService.sendWelcomeEmail(user.email, user.name).catch(err => {
            console.warn(`[verifyOTP] Failed to send welcome email: ${err}`);
        });

        createSendToken(user, 200, res);
    } catch (error) {
        handleError(error, res, 'verifyOTP');
    }
};

export const resendOTP = async (
    req: Request<object, object, ResendOTPBody>,
    res: Response
): Promise<void> => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpiry');

        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        if (user.isEmailVerified) {
            sendError(res, 400, 'Email is already verified');
            return;
        }

        const otp = user.generateOTP();
        await user.save({ validateBeforeSave: false });

        const emailResult = await emailService.sendOTP(email, otp, user.name);
        if (!emailResult.success) {
            sendError(res, 500, 'Failed to send OTP email. Please try again.');
            return;
        }

        if (config.env === 'development') {
            console.log(`[DEV] Resent OTP for ${email}: ${otp}`);
        }

        sendResponse(res, 200, {
            success: true,
            message: 'OTP has been sent to your email',
            data: { otpExpiresIn: '10 minutes' }
        });
    } catch (error) {
        handleError(error, res, 'resendOTP');
    }
};

export const login = async (
    req: Request<object, object, LoginBody>,
    res: Response
): Promise<void> => {
    try {
        const { emailOrUsername, password } = req.body;

        const user = await User.findOne({
            $or: [
                { email: emailOrUsername.toLowerCase() },
                { username: emailOrUsername.toLowerCase() }
            ],
            isActive: true
        }).select('+password');

        if (!user) {
            sendError(res, 401, 'Invalid credentials');
            return;
        }

        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            sendError(res, 401, 'Invalid credentials');
            return;
        }

        if (!user.isEmailVerified) {
            sendError(res, 403, 'Please verify your email before logging in');
            return;
        }

        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

        createSendToken(user, 200, res);
    } catch (error) {
        handleError(error, res, 'login');
    }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
    res.cookie('token', 'loggedout', {
        expires: new Date(Date.now() + 1000),
        httpOnly: true
    });

    sendResponse(res, 200, { success: true, message: 'Logged out successfully' });
};

export const getProfile = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 401, 'Not authenticated');
            return;
        }

        const user = await User.findById(req.user._id)
            .populate('solvedProblems', 'title difficulty')
            .populate('bookmarkedProblems', 'title difficulty');

        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        sendResponse(res, 200, {
            success: true,
            data: { user: sanitizeUser(user) }
        });
    } catch (error) {
        handleError(error, res, 'getProfile');
    }
};

export const updateProfile = async (
    req: AuthenticatedRequest & { body: UpdateProfileBody },
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 401, 'Not authenticated');
            return;
        }

        const restrictedFields = [
            'password', 'email', 'username', 'role', 'otp', 'otpExpiry',
            'isEmailVerified', 'otpVerified', 'totalMocksAttempted',
            'completedMocks', 'stats', 'isActive', 'createdAt', 'updatedAt',
            'subscription', 'mentorProfile', 'solvedProblems', 'bookmarkedProblems',
            'passwordResetToken', 'passwordResetExpires', 'passwordChangedAt'
        ];

        const filteredBody: Record<string, unknown> = { ...req.body };
        restrictedFields.forEach(field => delete filteredBody[field]);

        const updateData: Record<string, unknown> = {};

        const allowedFields = ['name', 'bio', 'age', 'college', 'level', 'languages', 'avatar', 'timezone'];
        allowedFields.forEach(field => {
            if (filteredBody[field] !== undefined) {
                updateData[field] = filteredBody[field];
            }
        });

        if (filteredBody.socialLinks && typeof filteredBody.socialLinks === 'object') {
            const socialLinks = filteredBody.socialLinks as Record<string, string>;
            if (socialLinks.github !== undefined) updateData['socialLinks.github'] = socialLinks.github;
            if (socialLinks.linkedin !== undefined) updateData['socialLinks.linkedin'] = socialLinks.linkedin;
            if (socialLinks.portfolio !== undefined) updateData['socialLinks.portfolio'] = socialLinks.portfolio;
        }

        if (filteredBody.codingProfiles && typeof filteredBody.codingProfiles === 'object') {
            const codingProfiles = filteredBody.codingProfiles as Record<string, string>;
            if (codingProfiles.leetcode !== undefined) updateData['codingProfiles.leetcode'] = codingProfiles.leetcode;
            if (codingProfiles.gfg !== undefined) updateData['codingProfiles.gfg'] = codingProfiles.gfg;
            if (codingProfiles.codeforces !== undefined) updateData['codingProfiles.codeforces'] = codingProfiles.codeforces;
            if (codingProfiles.codechef !== undefined) updateData['codingProfiles.codechef'] = codingProfiles.codechef;
            if (codingProfiles.github !== undefined) updateData['codingProfiles.github'] = codingProfiles.github;
        }

        if (Object.keys(updateData).length === 0) {
            sendError(res, 400, 'No valid fields to update');
            return;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            sendError(res, 404, 'User not found');
            return;
        }

        sendResponse(res, 200, {
            success: true,
            message: 'Profile updated successfully',
            data: { user: sanitizeUser(updatedUser) }
        });
    } catch (error) {
        handleError(error, res, 'updateProfile');
    }
};

export const changePassword = async (
    req: AuthenticatedRequest & { body: ChangePasswordBody },
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 401, 'Not authenticated');
            return;
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            sendError(res, 400, 'New password and confirmation do not match');
            return;
        }

        if (currentPassword === newPassword) {
            sendError(res, 400, 'New password must be different from current password');
            return;
        }

        const user = await User.findById(req.user._id).select('+password');

        if (!user) {
            sendError(res, 404, 'User not found');
            return;
        }

        const isPasswordCorrect = await user.comparePassword(currentPassword);
        if (!isPasswordCorrect) {
            sendError(res, 401, 'Current password is incorrect');
            return;
        }

        user.password = newPassword;
        await user.save();

        emailService.sendPasswordChangedEmail(user.email, user.name).catch(err => {
            console.warn(`[changePassword] Failed to send notification: ${err}`);
        });

        createSendToken(user, 200, res);
    } catch (error) {
        handleError(error, res, 'changePassword');
    }
};

export const forgotPassword = async (
    req: Request<object, object, ForgotPasswordBody>,
    res: Response
): Promise<void> => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase(), isActive: true });

        if (!user) {
            sendResponse(res, 200, {
                success: true,
                message: 'If an account exists with that email, a password reset link will be sent.'
            });
            return;
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        if (config.env === 'development') {
            console.log(`[DEV] Reset token for ${email}: ${resetToken}`);
        }

        emailService.sendPasswordResetEmail(user.email, user.name, resetToken).catch(err => {
            console.warn(`[forgotPassword] Failed to send reset email: ${err}`);
        });

        sendResponse(res, 200, {
            success: true,
            message: 'If an account exists with that email, a password reset link will be sent.'
        });
    } catch (error) {
        handleError(error, res, 'forgotPassword');
    }
};

export const resetPassword = async (
    req: Request<object, object, ResetPasswordBody>,
    res: Response
): Promise<void> => {
    try {
        const { token, password, passwordConfirm } = req.body;

        if (password !== passwordConfirm) {
            sendError(res, 400, 'Passwords do not match');
            return;
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() },
            isActive: true
        }).select('+password +passwordResetToken +passwordResetExpires');

        if (!user) {
            sendError(res, 400, 'Token is invalid or has expired');
            return;
        }

        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        sendResponse(res, 200, {
            success: true,
            message: 'Password has been reset successfully. Please login with your new password.'
        });

        setImmediate(() => {
            emailService.sendPasswordChangedEmail(user.email, user.name).catch(err => {
                console.warn(`[resetPassword] Failed to send notification: ${err.message}`);
            });
        });

    } catch (error) {
        handleError(error, res, 'resetPassword');
    }
};


export default {
    register,
    verifyOTP,
    resendOTP,
    login,
    logout,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
};