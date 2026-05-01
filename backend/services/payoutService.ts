import * as cron from 'node-cron';
import Booking from '../models/booking';
import Payout from '../models/payout';
import Mentor from '../models/mentor';
import notificationService from './notificationService';

/**
 * Payout Processing Service.
 * Weekly cron (Monday 6 AM IST): aggregates completed bookings per mentor,
 * calculates platform fee, creates Payout documents.
 */
class PayoutService {
    private task: cron.ScheduledTask | null = null;

    /**
     * Start the weekly payout cron.
     * Runs every Monday at 6:00 AM IST (0:30 UTC).
     */
    start(): void {
        // Monday at 6 AM IST = 0:30 UTC
        this.task = cron.schedule('30 0 * * 1', async () => {
            try {
                await this.processWeeklyPayouts();
            } catch (err) {
                console.error('[PayoutService] Cron error:', err);
            }
        }, {
            timezone: 'Asia/Kolkata'
        });

        console.log('💰 Payout service started (every Monday 6 AM IST)');
    }

    /**
     * Stop the cron job.
     */
    stop(): void {
        if (this.task) {
            this.task.stop();
            this.task = null;
            console.log('💰 Payout service stopped');
        }
    }

    /**
     * Process weekly payouts.
     * Aggregates completed bookings from the past week per mentor.
     */
    async processWeeklyPayouts(): Promise<void> {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '15');

        console.log(`[PayoutService] Processing payouts for ${oneWeekAgo.toISOString()} – ${now.toISOString()}`);

        // Find all completed, paid bookings from the past week that haven't been paid out
        const mentorEarnings = await Booking.aggregate([
            {
                $match: {
                    status: 'completed',
                    'payment.status': 'paid',
                    'payment.paidAt': { $gte: oneWeekAgo, $lte: now },
                    payoutProcessed: { $ne: true }
                }
            },
            {
                $group: {
                    _id: '$mentor',
                    totalAmount: { $sum: '$payment.amount' },
                    bookingIds: { $push: '$_id' },
                    bookingCount: { $sum: 1 }
                }
            }
        ]);

        if (mentorEarnings.length === 0) {
            console.log('[PayoutService] No payouts to process');
            return;
        }

        console.log(`[PayoutService] Processing ${mentorEarnings.length} mentor payouts`);

        for (const entry of mentorEarnings) {
            try {
                const platformFee = Math.round(entry.totalAmount * (platformFeePercent / 100));
                const netAmount = entry.totalAmount - platformFee;

                // Create payout record
                const payout = await Payout.create({
                    mentor: entry._id,
                    bookings: entry.bookingIds,
                    amount: entry.totalAmount,
                    platformFee,
                    netAmount,
                    currency: 'INR',
                    status: 'pending', // Manual transfer initially
                    period: {
                        start: oneWeekAgo,
                        end: now
                    }
                });

                // Mark bookings as payout-processed
                await Booking.updateMany(
                    { _id: { $in: entry.bookingIds } },
                    { $set: { payoutProcessed: true } }
                );

                // Get mentor user info for notification
                const mentor = await Mentor.findById(entry._id).populate('user', 'name');
                const mentorUser = mentor?.user as unknown as { _id: string; name: string };

                if (mentorUser) {
                    await notificationService.create({
                        userId: mentorUser._id.toString(),
                        type: 'payout_processed',
                        title: 'Payout Ready 💰',
                        message: `Your weekly payout of ₹${netAmount} for ${entry.bookingCount} sessions is being processed.`,
                        data: {
                            payoutId: payout._id.toString(),
                            amount: netAmount,
                            sessions: entry.bookingCount
                        },
                        actionUrl: '/mentor/dashboard'
                    });
                }

                console.log(`[PayoutService] Created payout for mentor ${entry._id}: ₹${netAmount}`);
            } catch (err) {
                console.error(`[PayoutService] Failed for mentor ${entry._id}:`, err);
            }
        }

        console.log('[PayoutService] Weekly payout processing complete');
    }
}

const payoutService = new PayoutService();
export default payoutService;
