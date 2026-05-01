import * as cron from 'node-cron';
import Booking from '../models/booking';
import Mentor from '../models/mentor';
import User from '../models/user';
import mentorEmailService from './mentorEmailService';
import notificationService from './notificationService';

/**
 * Session Reminder Service.
 * Runs a cron job every 5 minutes to send reminders for sessions
 * starting within the next 15 minutes.
 */
class ReminderService {
    private task: cron.ScheduledTask | null = null;

    /**
     * Start the reminder cron job.
     * Runs every 5 minutes: finds bookings where scheduledAt is 10–20 min away
     * and reminderSent === false, then sends reminders.
     */
    start(): void {
        this.task = cron.schedule('*/5 * * * *', async () => {
            try {
                await this.processReminders();
            } catch (err) {
                console.error('[ReminderService] Cron error:', err);
            }
        });

        console.log('⏰ Reminder service started (every 5 minutes)');
    }

    /**
     * Stop the cron job.
     */
    stop(): void {
        if (this.task) {
            this.task.stop();
            this.task = null;
            console.log('⏰ Reminder service stopped');
        }
    }

    /**
     * Process pending reminders.
     */
    private async processReminders(): Promise<void> {
        const now = new Date();
        const tenMinFromNow = new Date(now.getTime() + 10 * 60 * 1000);
        const twentyMinFromNow = new Date(now.getTime() + 20 * 60 * 1000);

        // Find bookings where:
        //   - scheduledAt is 10–20 min from now
        //   - reminderSent is false
        //   - status is confirmed
        const bookings = await Booking.find({
            scheduledAt: { $gte: tenMinFromNow, $lte: twentyMinFromNow },
            reminderSent: false,
            status: { $in: ['confirmed', 'pending'] }
        }).populate('mentor student');

        if (bookings.length === 0) return;

        console.log(`[ReminderService] Processing ${bookings.length} reminders`);

        for (const booking of bookings) {
            try {
                // Get mentor user info
                const mentorDoc = await Mentor.findById(booking.mentor).populate('user', 'name email');
                const studentDoc = await User.findById(booking.student).select('name email');

                if (!mentorDoc || !studentDoc) continue;

                const mentorUser = mentorDoc.user as unknown as { name: string; email: string; _id: string };
                const minutesUntil = Math.round((booking.scheduledAt.getTime() - now.getTime()) / 60000);

                // Send reminder to student
                await mentorEmailService.sendBookingReminder({
                    recipientEmail: studentDoc.email,
                    recipientName: studentDoc.name,
                    mentorName: mentorUser.name,
                    scheduledAt: booking.scheduledAt,
                    meetingLink: booking.meetingLink || '',
                    bookingId: booking.bookingId || booking._id.toString(),
                    minutesUntil
                });

                // Send reminder to mentor
                await mentorEmailService.sendBookingReminder({
                    recipientEmail: mentorUser.email,
                    recipientName: mentorUser.name,
                    mentorName: mentorUser.name,
                    scheduledAt: booking.scheduledAt,
                    meetingLink: booking.meetingLink || '',
                    bookingId: booking.bookingId || booking._id.toString(),
                    minutesUntil
                });

                // Create notifications for both
                await Promise.all([
                    notificationService.create({
                        userId: studentDoc._id.toString(),
                        type: 'booking_reminder',
                        title: `Session in ${minutesUntil} minutes`,
                        message: `Your session with ${mentorUser.name} starts soon. Get ready!`,
                        data: { bookingId: booking._id.toString() },
                        actionUrl: `/bookings/${booking.bookingId || booking._id}`
                    }),
                    notificationService.create({
                        userId: mentorUser._id.toString(),
                        type: 'booking_reminder',
                        title: `Session in ${minutesUntil} minutes`,
                        message: `Your session with ${studentDoc.name} starts soon.`,
                        data: { bookingId: booking._id.toString() },
                        actionUrl: `/bookings/${booking.bookingId || booking._id}`
                    })
                ]);

                // Mark reminder as sent
                await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });

                console.log(`[ReminderService] Sent reminder for booking ${booking._id}`);
            } catch (err) {
                console.error(`[ReminderService] Failed for booking ${booking._id}:`, err);
            }
        }
    }
}

const reminderService = new ReminderService();
export default reminderService;
