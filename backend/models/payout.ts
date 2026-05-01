import mongoose, { Schema } from 'mongoose';
import { IPayout } from '../types/type';

const PayoutSchema = new Schema<IPayout>({
    mentor: { type: Schema.Types.ObjectId, ref: 'Mentor', required: true },
    bookings: [{ type: Schema.Types.ObjectId, ref: 'Booking' }],
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    method: { type: String, enum: ['bank_transfer', 'upi'] },
    transactionId: { type: String },
    failureReason: { type: String },
    processedAt: { type: Date },
    period: {
        start: { type: Date, required: true },
        end: { type: Date, required: true }
    }
}, {
    timestamps: true
});

// Indexes
PayoutSchema.index({ mentor: 1, status: 1 });
PayoutSchema.index({ status: 1, processedAt: 1 });
PayoutSchema.index({ 'period.start': 1, 'period.end': 1 });

const Payout = mongoose.model<IPayout>('Payout', PayoutSchema);

export default Payout;
