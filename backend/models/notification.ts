import mongoose, { Schema } from 'mongoose';
import { INotification } from '../types/type';

const NotificationSchema = new Schema<INotification>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: [
            'booking_confirmed', 'booking_cancelled', 'booking_reminder',
            'session_started', 'session_completed',
            'new_message', 'message_digest',
            'payment_received', 'payout_processed',
            'review_received', 'mentor_approved', 'mentor_rejected'
        ],
        required: true
    },
    title: { type: String, required: true, maxLength: 200 },
    message: { type: String, required: true, maxLength: 500 },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    actionUrl: { type: String }
}, {
    timestamps: true
});

// Indexes
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
// TTL: auto-delete notifications older than 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
