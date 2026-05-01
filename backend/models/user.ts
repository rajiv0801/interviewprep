import mongoose, { Document, Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { IUser, IUserModel } from '../types/type';

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true, trim: true, minLength: 3, maxLength: 20 },
    username: { type: String, unique: true, trim: true, lowercase: true, minLength: 3, maxLength: 20 },
    email: { type: String, required: true, lowercase: true, unique: true, trim: true },
    password: { type: String, required: true, minLength: 8 },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date, select: false },
    bio: { type: String, maxLength: 500 },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    languages: [{ type: String, enum: ['JavaScript', 'Python', 'C++', 'Java', 'Rust'] }],
    age: { type: Number, min: 13, max: 100 },
    role: { type: String, enum: ['user', 'admin', 'professor'], default: 'user' },
    isEmailVerified: { type: Boolean, default: false },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpVerified: { type: Boolean, default: false },
    totalMocksAttempted: { type: Number, default: 0 },
    completedMocks: { type: Number, default: 0 },
    college: { type: String, trim: true, maxLength: 100 },
    companies: [{
        type: String,
        trim: true,
        enum: ['Microsoft', 'Google', 'Meta', 'Amazon', 'Apple', 'Oracle', 'Adobe', 'Salesforce', 'SAP', 'Intel', 'Qualcomm', 'Nvidia', 'Samsung', 'Netflix', 'Uber', 'Airbnb', 'LinkedIn', 'Twitter', 'Stripe']
    }],
    avatar: { type: String },
    timezone: { type: String, default: 'Asia/Kolkata' },
    lastLoginAt: { type: Date },
    subscription: {
        plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
        expiresAt: { type: Date },
        stripeCustomerId: { type: String }
    },
    mentorProfile: { type: Schema.Types.ObjectId, ref: 'Mentor' },
    solvedProblems: [{ type: Schema.Types.ObjectId, ref: 'Problem' }],
    bookmarkedProblems: [{ type: Schema.Types.ObjectId, ref: 'Problem' }],
    stats: {
        totalSubmissions: { type: Number, default: 0 },
        acceptedSubmissions: { type: Number, default: 0 },
        averageRuntime: { type: Number, default: 0, min: 0 },
        accuracy: { type: Number, default: 0, min: 0, max: 100 },
        rank: { type: Number }
    },
    socialLinks: {
        github: { type: String, trim: true },
        linkedin: { type: String, trim: true },
        portfolio: { type: String, trim: true }
    },
    codingProfiles: {
        leetcode: { type: String, trim: true },
        gfg: { type: String, trim: true },
        codeforces: { type: String, trim: true },
        codechef: { type: String, trim: true },
        github: { type: String, trim: true }
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        virtuals: true,
        transform(_doc: Document, ret: Record<string, unknown>) {
            delete ret.password;
            delete ret.otp;
            delete ret.otpExpiry;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ username: 1, isActive: 1 });

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.pre('save', async function () {
    if (!this.isModified('password') || this.isNew) return;
    this.passwordChangedAt = new Date(Date.now() - 1000);
});

UserSchema.statics.findByEmailorUsername = function (emailorUsername: string) {
    return this.findOne({
        $or: [
            { email: emailorUsername.toLowerCase() },
            { username: emailorUsername.toLowerCase() }
        ],
        isActive: true
    }).select('+password +otp +otpExpiry');
};

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateOTP = function (): string {
    const otp = crypto.randomInt(100000, 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    this.otp = otp;
    this.otpExpiry = otpExpiry;
    this.otpVerified = false;
    return otp;
};

UserSchema.methods.verifyOTP = function (otp: string): boolean {
    if (!this.otp || !this.otpExpiry) return false;
    if (Date.now() > this.otpExpiry.getTime()) return false;
    return this.otp === otp;
};

UserSchema.methods.clearOTP = function (): void {
    this.otp = undefined;
    this.otpExpiry = undefined;
    this.otpVerified = true;
};

UserSchema.methods.createPasswordResetToken = function (): string {
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store hashed token in database
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Token expires in 1 hour
    this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Return unhashed token (will be sent via email)
    return resetToken;
};

const User = mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;
