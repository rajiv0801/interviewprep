import emailService from './emailService';

interface BookingConfirmedParams {
    studentEmail: string;
    studentName: string;
    mentorName: string;
    scheduledAt: Date;
    duration: number;
    topic?: string;
    meetingLink: string;
    bookingId: string;
    timezone: string;
}

interface BookingCancelledParams {
    recipientEmail: string;
    recipientName: string;
    mentorName: string;
    studentName: string;
    scheduledAt: Date;
    reason?: string;
    cancelledBy: 'student' | 'mentor' | 'system';
    bookingId: string;
}

interface BookingReminderParams {
    recipientEmail: string;
    recipientName: string;
    mentorName: string;
    scheduledAt: Date;
    meetingLink: string;
    bookingId: string;
    minutesUntil: number;
}

interface MentorApprovedParams {
    mentorEmail: string;
    mentorName: string;
}

interface MentorRejectedParams {
    mentorEmail: string;
    mentorName: string;
    reason?: string;
}

interface PaymentReceiptParams {
    studentEmail: string;
    studentName: string;
    mentorName: string;
    amount: number;
    currency: string;
    bookingId: string;
    scheduledAt: Date;
    razorpayPaymentId: string;
}

const formatDate = (date: Date, timezone = 'Asia/Kolkata'): string => {
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: timezone
    }).format(date);
};

class MentorEmailService {

    async sendBookingConfirmed(params: BookingConfirmedParams): Promise<void> {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        await emailService['sendEmail'](
            params.studentEmail,
            `Session Confirmed with ${params.mentorName} – Graphora`,
            'booking-confirmed',
            {
                studentName: params.studentName,
                mentorName: params.mentorName,
                scheduledAt: formatDate(params.scheduledAt, params.timezone),
                duration: params.duration,
                topic: params.topic || 'General Discussion',
                meetingLink: params.meetingLink,
                bookingId: params.bookingId,
                bookingUrl: `${frontendUrl}/bookings/${params.bookingId}`,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@graphora.com'
            }
        );
    }

    async sendBookingCancelled(params: BookingCancelledParams): Promise<void> {
        const cancellerName = params.cancelledBy === 'student'
            ? params.studentName
            : params.cancelledBy === 'mentor'
                ? params.mentorName
                : 'System';

        await emailService['sendEmail'](
            params.recipientEmail,
            `Session Cancelled – Graphora`,
            'booking-cancelled',
            {
                recipientName: params.recipientName,
                mentorName: params.mentorName,
                studentName: params.studentName,
                scheduledAt: formatDate(params.scheduledAt),
                reason: params.reason || 'No reason provided',
                cancelledBy: cancellerName,
                bookingId: params.bookingId,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@graphora.com'
            }
        );
    }

    async sendBookingReminder(params: BookingReminderParams): Promise<void> {
        await emailService['sendEmail'](
            params.recipientEmail,
            `Reminder: Your session starts in ${params.minutesUntil} minutes – Graphora`,
            'booking-reminder',
            {
                recipientName: params.recipientName,
                mentorName: params.mentorName,
                scheduledAt: formatDate(params.scheduledAt),
                meetingLink: params.meetingLink,
                minutesUntil: params.minutesUntil,
                bookingId: params.bookingId,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@graphora.com'
            }
        );
    }

    async sendMentorApproved(params: MentorApprovedParams): Promise<void> {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        await emailService['sendEmail'](
            params.mentorEmail,
            `🎉 Your Mentor Application is Approved – Graphora`,
            'mentor-approved',
            {
                mentorName: params.mentorName,
                dashboardUrl: `${frontendUrl}/mentor/dashboard`,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@graphora.com'
            }
        );
    }

    async sendMentorRejected(params: MentorRejectedParams): Promise<void> {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        await emailService['sendEmail'](
            params.mentorEmail,
            `Update on Your Mentor Application – Graphora`,
            'mentor-rejected',
            {
                mentorName: params.mentorName,
                reason: params.reason || 'Your application did not meet our current requirements.',
                reapplyUrl: `${frontendUrl}/mentors/apply`,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@graphora.com'
            }
        );
    }

    async sendPaymentReceipt(params: PaymentReceiptParams): Promise<void> {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        await emailService['sendEmail'](
            params.studentEmail,
            `Payment Receipt – Graphora`,
            'payment-receipt',
            {
                studentName: params.studentName,
                mentorName: params.mentorName,
                amount: params.amount,
                currency: params.currency,
                bookingId: params.bookingId,
                scheduledAt: formatDate(params.scheduledAt),
                razorpayPaymentId: params.razorpayPaymentId,
                bookingUrl: `${frontendUrl}/bookings/${params.bookingId}`,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@graphora.com'
            }
        );
    }
}

const mentorEmailService = new MentorEmailService();
export default mentorEmailService;
export { MentorEmailService };
