import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import Booking from '../models/booking';
import Mentor from '../models/mentor';
import Notification from '../models/notification';
import razorpayService from '../services/razorpayService';
import mentorEmailService from '../services/mentorEmailService';

const sendSuccess = (res: Response, data: unknown, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res: Response, message: string, statusCode = 400, error?: unknown) => {
    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined
    });
};

// ==================== VERIFY PAYMENT ====================

/**
 * POST /api/payments/verify
 * Called after Razorpay checkout completes on the frontend.
 * Verifies signature, confirms booking, and sends confirmation email.
 */
export const verifyPayment = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
            sendError(res, 'Missing payment verification parameters', 400);
            return;
        }

        // 1. Verify signature
        const isValid = razorpayService.verifyPaymentSignature({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        });

        if (!isValid) {
            sendError(res, 'Payment verification failed. Invalid signature.', 400);
            return;
        }

        // 2. Find the booking
        const booking = await Booking.findOne({
            $or: [{ bookingId }, { 'payment.razorpayOrderId': razorpayOrderId }],
            student: user._id,
            status: 'pending'
        });

        if (!booking) {
            sendError(res, 'Booking not found or already processed', 404);
            return;
        }

        // 3. Update booking to confirmed
        booking.status = 'confirmed';
        booking.payment.razorpayPaymentId = razorpayPaymentId;
        booking.payment.status = 'paid';
        booking.payment.paidAt = new Date();
        await booking.save();

        // 4. Fetch mentor and student details for email
        const mentor = await Mentor.findById(booking.mentor).populate('user', 'name email _id');
        const mentorUser = mentor?.user as { name: string; email: string; _id: string } | undefined;

        // 5. Send confirmation email to student
        try {
            await mentorEmailService.sendBookingConfirmed({
                studentEmail: user.email,
                studentName: user.name,
                mentorName: mentorUser?.name || 'Your Mentor',
                scheduledAt: booking.scheduledAt,
                duration: booking.duration,
                topic: booking.topic,
                meetingLink: booking.meetingLink || `${process.env.FRONTEND_URL}/bookings/${booking.bookingId}`,
                bookingId: booking.bookingId,
                timezone: booking.timezone || 'Asia/Kolkata'
            });

            // 6. Send payment receipt
            await mentorEmailService.sendPaymentReceipt({
                studentEmail: user.email,
                studentName: user.name,
                mentorName: mentorUser?.name || 'Your Mentor',
                amount: booking.payment.amount,
                currency: booking.payment.currency,
                bookingId: booking.bookingId,
                scheduledAt: booking.scheduledAt,
                razorpayPaymentId
            });
        } catch (emailErr) {
            console.error('[verifyPayment] Email send failed:', emailErr);
            // Don't fail the request if email fails
        }

        // 7. Notify mentor
        if (mentorUser) {
            try {
                await Notification.create({
                    user: mentorUser._id,
                    type: 'booking_confirmed',
                    title: 'New Session Booked!',
                    message: `${user.name} has booked a ${booking.duration}-min session with you on ${booking.scheduledAt.toLocaleDateString()}.`,
                    data: { bookingId: booking.bookingId },
                    actionUrl: `/mentor/dashboard`
                });
            } catch (notifErr) {
                console.error('[verifyPayment] Notification failed:', notifErr);
            }
        }

        sendSuccess(res, {
            booking: {
                _id: booking._id,
                bookingId: booking.bookingId,
                status: booking.status,
                scheduledAt: booking.scheduledAt,
                duration: booking.duration,
                payment: {
                    amount: booking.payment.amount,
                    currency: booking.payment.currency,
                    status: booking.payment.status,
                    paidAt: booking.payment.paidAt
                }
            }
        }, 'Payment verified. Booking confirmed!');
    } catch (error) {
        console.error('[verifyPayment]', error);
        sendError(res, 'Payment verification failed', 500, error);
    }
};

// ==================== RAZORPAY WEBHOOK ====================

/**
 * POST /api/payments/webhook
 * Handles Razorpay webhook events (payment.captured, refund.processed, etc.)
 * Must be registered BEFORE body-parser JSON middleware (needs raw body).
 */
export const handleWebhook = async (
    req: Request,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const signature = req.headers['x-razorpay-signature'] as string;
        const payload = JSON.stringify(req.body);

        if (!signature) {
            res.status(400).json({ success: false, message: 'Missing webhook signature' });
            return;
        }

        // Verify webhook signature
        const isValid = razorpayService.verifyWebhookSignature(payload, signature);
        if (!isValid) {
            console.warn('[handleWebhook] Invalid webhook signature');
            res.status(400).json({ success: false, message: 'Invalid webhook signature' });
            return;
        }

        const event = req.body;
        console.log(`[Razorpay Webhook] Event: ${event.event}`);

        switch (event.event) {
            case 'payment.captured': {
                const payment = event.payload.payment.entity;
                const orderId = payment.order_id;

                // Find booking by Razorpay order ID and confirm if still pending
                const booking = await Booking.findOne({
                    'payment.razorpayOrderId': orderId,
                    status: 'pending'
                });

                if (booking) {
                    booking.status = 'confirmed';
                    booking.payment.razorpayPaymentId = payment.id;
                    booking.payment.status = 'paid';
                    booking.payment.paidAt = new Date();
                    await booking.save();
                    console.log(`[Webhook] Booking ${booking.bookingId} confirmed via webhook`);
                }
                break;
            }

            case 'refund.processed': {
                const refund = event.payload.refund.entity;
                const paymentId = refund.payment_id;

                await Booking.findOneAndUpdate(
                    { 'payment.razorpayPaymentId': paymentId },
                    {
                        $set: {
                            'payment.status': 'refunded',
                            'refund.razorpayRefundId': refund.id,
                            'refund.processedAt': new Date()
                        }
                    }
                );
                console.log(`[Webhook] Refund processed for payment ${paymentId}`);
                break;
            }

            case 'payment.failed': {
                const payment = event.payload.payment.entity;
                const orderId = payment.order_id;

                await Booking.findOneAndUpdate(
                    { 'payment.razorpayOrderId': orderId, status: 'pending' },
                    { $set: { 'payment.status': 'failed', status: 'cancelled', cancelledBy: 'system', cancellationReason: 'Payment failed' } }
                );
                console.log(`[Webhook] Payment failed for order ${orderId}`);
                break;
            }

            default:
                console.log(`[Webhook] Unhandled event: ${event.event}`);
        }

        // Always respond 200 to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('[handleWebhook]', error);
        res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
};

// ==================== GET PAYMENT STATUS ====================

/**
 * GET /api/payments/status/:bookingId
 * Returns the payment status for a booking.
 */
export const getPaymentStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
): Promise<void> => {
    try {
        const user = req.user!;
        const { bookingId } = req.params;

        const booking = await Booking.findOne({
            $or: [{ bookingId }, { _id: bookingId }],
            student: user._id
        }).select('bookingId status payment scheduledAt duration');

        if (!booking) {
            sendError(res, 'Booking not found', 404);
            return;
        }

        sendSuccess(res, {
            bookingId: booking.bookingId,
            status: booking.status,
            payment: {
                amount: booking.payment.amount,
                currency: booking.payment.currency,
                status: booking.payment.status,
                paidAt: booking.payment.paidAt
            }
        });
    } catch (error) {
        console.error('[getPaymentStatus]', error);
        sendError(res, 'Failed to fetch payment status', 500, error);
    }
};
