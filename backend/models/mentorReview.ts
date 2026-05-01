import mongoose, { Schema } from 'mongoose';
import { IMentorReview } from '../types/type';

const MentorReviewSchema = new Schema<IMentorReview>({
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    mentor: { type: Schema.Types.ObjectId, ref: 'Mentor', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, maxLength: 1000 },
    isPublic: { type: Boolean, default: true },
    isReported: { type: Boolean, default: false },
    reportReason: { type: String },
    mentorReply: {
        content: { type: String, maxLength: 500 },
        repliedAt: { type: Date }
    }
}, {
    timestamps: true
});

// Indexes
MentorReviewSchema.index({ mentor: 1, createdAt: -1 });
MentorReviewSchema.index({ student: 1 });
// Indexes
MentorReviewSchema.index({ isPublic: 1, isReported: 1 });

const MentorReview = mongoose.model<IMentorReview>('MentorReview', MentorReviewSchema);

export default MentorReview;
