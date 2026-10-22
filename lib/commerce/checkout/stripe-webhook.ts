import 'server-only';

import Stripe from 'stripe';
import { z } from 'zod';
import {
  PaymentTotalsError,
  readStripeSessionAmounts,
} from './payment-totals';

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().nullable().optional(),
  city: z.string().min(1),
  state: z.string().nullable().optional(),
  postal_code: z.string().min(1),
  country: z.string().length(2),
});

const shippingDetailsSchema = z.object({
  name: z.string().min(1),
  address: addressSchema,
});

export interface StripeWebhookStore {
  beginEvent(event: Stripe.Event): Promise<boolean>;
  claimFailedEvent(eventId: string): Promise<Stripe.Event | null>;
  completeEvent(eventId: string): Promise<void>;
  closeCheckout(input: { eventId: string; stripeSessionId: string; reason: 'expired' | 'payment_failed' }): Promise<void>;
  recordPaymentHold(input: {
    eventId: string;
    paymentIntentId: string;
    reason: 'refund' | 'dispute';
    refundedAmount: number;
  }): Promise<void>;
  failEvent(
    eventId: string,
    code: string,
    message: string,
  ): Promise<void>;
  completePayment(input: {
    eventId: string;
    stripeSessionId: string;
    paymentIntentId: string;
    customerEmail: string;
    shippingAddress: z.infer<typeof addressSchema> & { name: string };
    /** Stripe amount_total: subtotal + shipping + tax. */
    paidAmount: number;
    amountSubtotal: number;
    amountShipping: number;
    amountTax: number;
    amountDiscount: number;
    currency: string;
  }): Promise<string>;
}

export class StripeWebhookValidationError extends Error {
  constructor(readonly code: string, message?: string) {
    super(message ?? `Stripe webhook validation failed: ${code}.`);
    this.name = 'StripeWebhookValidationError';
  }
}
export function verifyStripeWebhookPayload(
  payload: string,
  signature: string,
  secret: string,
) {
  const stripe = new Stripe('sk_test_signature_verification_only', {
    apiVersion: '2026-04-22.dahlia',
  });
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * True when a signed event's livemode disagrees with this deployment's
 * STRIPE_MODE. Separate signing secrets normally keep test and live apart; this
 * stops a misconfigured secret from letting one mode's events settle the other's
 * orders.
 */
export function isStripeEventModeMismatch(
  event: Pick<Stripe.Event, 'livemode'>,
  stripeMode = process.env.STRIPE_MODE,
) {
  return event.livemode !== (stripeMode === 'live');
}

export class StripeCheckoutWebhookService {
  constructor(private readonly store: StripeWebhookStore) {}

  async process(event: Stripe.Event) {
    const isNew = await this.store.beginEvent(event);
    if (!isNew) {
      // A prior delivery may have failed after its receipt was recorded.
      // Atomically reclaim only failed receipts; never rerun processed or in-flight events.
      const claimed = await this.store.claimFailedEvent(event.id);
      if (!claimed) return { duplicate: true, orderId: null };
      return this.processClaimed(claimed);
    }
    return this.processClaimed(event);
  }

  async replay(eventId: string) {
    const event = await this.store.claimFailedEvent(eventId);
    if (!event) return { duplicate: true, orderId: null };
    return this.processClaimed(event);
  }

  private async processClaimed(event: Stripe.Event) {
    try {
      if (isStripeEventModeMismatch(event)) {
        throw new StripeWebhookValidationError('EVENT_MODE_MISMATCH');
      }
      if (event.type === 'charge.refunded' || event.type.startsWith('refund.') || event.type.startsWith('charge.dispute.')) {
        const object = event.data.object as unknown as Record<string, unknown>;
        const intent = object.payment_intent;
        const paymentIntentId = typeof intent === 'string' ? intent : (intent as { id?: string } | null)?.id;
        if (!paymentIntentId) throw new StripeWebhookValidationError('PAYMENT_INTENT_MISSING');
        // charge.refunded carries the cumulative amount. Individual refund
        // amounts must not be summed across created/updated duplicate events.
        const refundedAmount = event.type === 'charge.refunded' ? object.amount_refunded : 0;
        if (!Number.isSafeInteger(refundedAmount) || (refundedAmount as number) < 0) {
          throw new StripeWebhookValidationError('INVALID_REFUND_AMOUNT');
        }
        await this.store.recordPaymentHold({
          eventId: event.id, paymentIntentId,
          reason: event.type.startsWith('charge.dispute.') ? 'dispute' : 'refund',
          refundedAmount: refundedAmount as number,
        });
        return { duplicate: false, orderId: null };
      }
      if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.id) throw new StripeWebhookValidationError('CHECKOUT_SESSION_MISSING');
        await this.store.closeCheckout({ eventId: event.id, stripeSessionId: session.id,
          reason: event.type === 'checkout.session.expired' ? 'expired' : 'payment_failed' });
        return { duplicate: false, orderId: null };
      }
      if (
        event.type !== 'checkout.session.completed' &&
        event.type !== 'checkout.session.async_payment_succeeded'
      ) {
        await this.store.completeEvent(event.id);
        return { duplicate: false, orderId: null };
      }

      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== 'paid') {
        await this.store.completeEvent(event.id);
        return { duplicate: false, orderId: null };
      }

      const shipping = session.collected_information?.shipping_details;
      const shippingDetails = shippingDetailsSchema.safeParse(shipping);
      if (!shippingDetails.success) {
        throw new StripeWebhookValidationError(
          'INCOMPLETE_SHIPPING_ADDRESS',
        );
      }
      if (!session.currency || !session.customer_details?.email) {
        throw new StripeWebhookValidationError(
          'INCOMPLETE_PAYMENT_DETAILS',
        );
      }
      let amounts;
      try {
        amounts = readStripeSessionAmounts(session);
      } catch (error) {
        if (error instanceof PaymentTotalsError) {
          throw new StripeWebhookValidationError(error.code);
        }
        throw error;
      }
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;
      if (!paymentIntentId) {
        throw new StripeWebhookValidationError(
          'PAYMENT_INTENT_MISSING',
        );
      }

      const orderId = await this.store.completePayment({
        eventId: event.id,
        stripeSessionId: session.id,
        paymentIntentId,
        customerEmail: session.customer_details.email,
        shippingAddress: {
          name: shippingDetails.data.name,
          ...shippingDetails.data.address,
        },
        paidAmount: amounts.total,
        amountSubtotal: amounts.subtotal,
        amountShipping: amounts.shipping,
        amountTax: amounts.tax,
        amountDiscount: amounts.discount,
        currency: session.currency.toUpperCase(),
      });
      return { duplicate: false, orderId };
    } catch (error) {
      const code =
        error instanceof StripeWebhookValidationError
          ? error.code
          : 'WEBHOOK_PROCESSING_FAILED';
      await this.store.failEvent(
        event.id,
        code,
        error instanceof Error ? error.message : 'Unknown processing error.',
      );
      throw error;
    }
  }
}
