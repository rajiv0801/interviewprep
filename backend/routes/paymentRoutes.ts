import { Router, Request } from 'express';
import { protect } from '../middleware/authMiddleware';
import { verifyPayment, handleWebhook, getPaymentStatus } from '../controller/paymentController';

const paymentRouter = Router();

// Webhook — no auth, raw body needed for signature verification
// Must be before any JSON body parsing middleware
paymentRouter.post('/webhook', handleWebhook);

// Verify payment after Razorpay checkout
paymentRouter.post('/verify', protect, verifyPayment);

// Get payment status for a booking
paymentRouter.get('/status/:bookingId', protect, getPaymentStatus);

export default paymentRouter;
