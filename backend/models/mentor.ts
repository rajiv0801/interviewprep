import mongoose, { Schema } from 'mongoose';
import { IMentor } from '../types/type';

const MentorSchema = new Schema<IMentor>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    avatar: { type: String },
    linkedinUrl: { type: String },
    headline: { type: String, maxLength: 150 },
    bio: { type: String, maxLength: 2000 },
    expertise: [{
        type: String,
        enum: ['DSA', 'System Design', 'Frontend', 'Backend', 'ML/AI', 'DevOps', 'Mobile']
    }],
    sessionTopics: [{
        type: String,
        enum: [
            'DSA Problem Solving', 'System Design', 'Resume Review',
            'Mock Interview', 'Career Guidance', 'Frontend Development',
            'Backend Development', 'ML/AI Guidance'
        ]
    }],
    languages: [{ type: String }],
    experience: {
        years: { type: Number, min: 0 },
        currentCompany: { type: String },
        currentRole: { type: String },
        pastCompanies: [{ type: String }]
    },
    availability: [{
        dayOfWeek: { type: Number, min: 0, max: 6, required: true },
        slots: [{
            start: { type: String, required: true },
            end: { type: String, required: true }
        }]
    }],
    timezone: { type: String, default: 'Asia/Kolkata' },
    pricing: {
        thirtyMin: { type: Number, min: 0 },
        sixtyMin: { type: Number, min: 0 },
        currency: { type: String, default: 'INR' }
    },
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    totalSessions: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    responseTime: { type: Number },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    applicationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    applicationNote: { type: String },
    cancellationRate: { type: Number, default: 0, min: 0, max: 100 },
    repeatStudentRate: { type: Number, default: 0, min: 0, max: 100 },
    payoutDetails: {
        method: { type: String, enum: ['bank_transfer', 'upi'] },
        upiId: { type: String },
        bankAccount: {
            accountNumber: { type: String },
            ifscCode: { type: String },
            accountHolder: { type: String }
        }
    },
    isAcceptingBookings: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Indexes
// Additional indexes
MentorSchema.index({ 'rating.average': -1 });
MentorSchema.index({ expertise: 1, isActive: 1 });
MentorSchema.index({ verified: 1, isAcceptingBookings: 1 });
MentorSchema.index({ applicationStatus: 1 });
MentorSchema.index({ 'pricing.thirtyMin': 1 });

// Auto-generate slug from user name before save (if not set)
MentorSchema.pre('save', async function () {
    if (!this.slug && this.isNew) {
        // Slug will be set in the controller using the user's name
        // This is a fallback using the ObjectId
        this.slug = `mentor-${this._id.toString().slice(-8)}`;
    }
});

const Mentor = mongoose.model<IMentor>('Mentor', MentorSchema);

export default Mentor;