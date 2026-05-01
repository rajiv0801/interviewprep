import mongoose, { Schema } from 'mongoose';
import { IBooking } from '../types/type';

const BookingSchema = new Schema<IBooking>({
    bookingId: { type: String, unique: true, sparse: true },
    mentor: { type: Schema.Types.ObjectId, ref: 'Mentor', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, enum: [30, 60], required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    type: { type: String, enum: ['video', 'chat'], default: 'video' },
    topic: { type: String, maxLength: 200 },
    agenda: { type: String, maxLength: 1000 },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
        default: 'pending'
    },
    jitsiRoomName: { type: String },
    meetingLink: { type: String },
    meetingProvider: { type: String, enum: ['jitsi', 'zoom', 'google_meet'], default: 'jitsi' },
    recordingUrl: { type: String },
    payment: {
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        status: {
            type: String,
            enum: ['pending', 'paid', 'refunded', 'failed'],
            default: 'pending'
        },
        paidAt: { type: Date }
    },
    platformFee: { type: Number },
    mentorPayout: {
        amount: { type: Number },
        status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },
        processedAt: { type: Date },
        transactionId: { type: String }
    },
    studentFeedback: {
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String, maxLength: 1000 },
        submittedAt: { type: Date }
    },
    sessionNotes: {
        content: { type: String, maxLength: 5000 },
        updatedAt: { type: Date }
    },
    refund: {
        amount: { type: Number },
        reason: { type: String },
        processedAt: { type: Date },
        razorpayRefundId: { type: String }
    },
    reminderSent: { type: Boolean, default: false },
    payoutProcessed: { type: Boolean, default: false },
    mentorNotes: { type: String, maxLength: 2000 },
    cancelledBy: { type: String, enum: ['student', 'mentor', 'system'] },
    cancellationReason: { type: String },
    cancelledAt: { type: Date }
}, {
    timestamps: true
});

// Indexes
// Text index for searching bookings
BookingSchema.index({ mentor: 1, scheduledAt: 1 });
BookingSchema.index({ student: 1, status: 1 });
BookingSchema.index({ scheduledAt: 1, status: 1 });
BookingSchema.index({ 'payment.status': 1 });
BookingSchema.index({ reminderSent: 1, scheduledAt: 1 });

const Booking = mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;