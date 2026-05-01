import Razorpay from 'razorpay';
import crypto from 'crypto';

interface RazorpayOrderOptions {
    amount: number;       // in paise (INR × 100)
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
}

interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    created_at: number;
}

interface VerifyPaymentParams {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

interface RefundResult {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    payment_id: string;
    status: string;
}

class RazorpayService {
    private client: Razorpay;

    constructor() {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            console.warn('[RazorpayService] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set. Payment features will be unavailable.');
        }

        this.client = new Razorpay({
            key_id: keyId || '',
            key_secret: keySecret || ''
        });
    }

    /**
     * Creates a Razorpay order for a booking.
     * Amount should be in INR (will be converted to paise internally).
     */
    async createOrder(options: RazorpayOrderOptions): Promise<RazorpayOrder> {
        const orderData = {
            amount: options.amount * 100, // convert INR → paise
            currency: options.currency || 'INR',
            receipt: options.receipt,
            notes: options.notes || {}
        };

        const order = await this.client.orders.create(orderData) as unknown as RazorpayOrder;
        return order;
    }

    /**
     * Verifies the Razorpay payment signature after client-side payment.
     * Returns true if signature is valid.
     */
    verifyPaymentSignature(params: VerifyPaymentParams): boolean {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;
        const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

        const body = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');

        return expectedSignature === razorpaySignature;
    }

    /**
     * Verifies a Razorpay webhook signature.
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');

        return expectedSignature === signature;
    }

    /**
     * Initiates a refund for a payment.
     * Amount in INR (converted to paise internally). If not provided, full refund.
     */
    async refundPayment(paymentId: string, amountInr?: number): Promise<RefundResult> {
        const refundData: { amount?: number } = {};
        if (amountInr !== undefined) {
            refundData.amount = amountInr * 100;
        }

        const refund = await this.client.payments.refund(paymentId, refundData) as unknown as RefundResult;
        return refund;
    }

    /**
     * Fetches payment details from Razorpay.
     */
    async fetchPayment(paymentId: string): Promise<Record<string, unknown>> {
        const payment = await this.client.payments.fetch(paymentId) as unknown as Record<string, unknown>;
        return payment;
    }

    /**
     * Calculates the platform fee and mentor payout for a booking amount.
     * Commission rate from env (default 15%).
     */
    calculateSplit(amountInr: number): { platformFee: number; mentorPayout: number } {
        const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.15');
        const platformFee = Math.round(amountInr * commissionRate);
        const mentorPayout = amountInr - platformFee;
        return { platformFee, mentorPayout };
    }
}

const razorpayService = new RazorpayService();
export default razorpayService;
export { RazorpayService, RazorpayOrder, VerifyPaymentParams, RefundResult };
