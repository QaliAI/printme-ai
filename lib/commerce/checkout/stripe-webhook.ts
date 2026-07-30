import 'server-only';

import Stripe from 'stripe';
import { z } from 'zod';

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
    paidAmount: number;
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

export class StripeCheckoutWebhookService {
  constructor(private readonly store: StripeWebhookStore) {}

  async process(event: Stripe.Event) {
    const isNew = await this.store.beginEvent(event);
    if (!isNew) return { duplicate: true, orderId: null };
    return this.processClaimed(event);
  }

  async replay(eventId: string) {
    const event = await this.store.claimFailedEvent(eventId);
    if (!event) return { duplicate: true, orderId: null };
    return this.processClaimed(event);
  }

  private async processClaimed(event: Stripe.Event) {
    try {
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
      if (
        session.amount_total === null ||
        !session.currency ||
        !session.customer_details?.email
      ) {
        throw new StripeWebhookValidationError(
          'INCOMPLETE_PAYMENT_DETAILS',
        );
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
        paidAmount: session.amount_total,
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
