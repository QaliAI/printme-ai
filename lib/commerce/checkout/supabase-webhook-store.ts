import 'server-only';

import type Stripe from 'stripe';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { StripeWebhookStore } from './stripe-webhook';

export class SupabaseStripeWebhookStore implements StripeWebhookStore {
  private get client() {
    if (
      process.env.COMMERCE_CHECKOUT_ENABLED !== 'true' ||
      process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true'
    ) {
      throw new Error('Stripe webhook persistence is disabled.');
    }
    return getSupabaseAdminClient();
  }

  async beginEvent(event: Stripe.Event) {
    const { data, error } = await this.client.rpc(
      'begin_commerce_webhook_event',
      {
        p_source: 'stripe',
        p_event_id: event.id,
        p_event_type: event.type,
        p_payload: event.data.object,
      },
    );
    if (error) throw error;
    return z.boolean().parse(data);
  }

  async completeEvent(eventId: string) {
    const { error } = await this.client.rpc(
      'finish_commerce_webhook_event',
      {
        p_source: 'stripe',
        p_event_id: eventId,
        p_status: 'processed',
        p_error_code: null,
        p_error_message: '',
      },
    );
    if (error) throw error;
  }

  async failEvent(eventId: string, code: string, message: string) {
    const { error } = await this.client.rpc(
      'finish_commerce_webhook_event',
      {
        p_source: 'stripe',
        p_event_id: eventId,
        p_status: 'failed',
        p_error_code: code,
        p_error_message: message,
      },
    );
    if (error) throw error;
  }

  async completePayment(
    input: Parameters<StripeWebhookStore['completePayment']>[0],
  ) {
    const { data, error } = await this.client.rpc(
      'complete_stripe_checkout_payment',
      {
        p_event_id: input.eventId,
        p_stripe_session_id: input.stripeSessionId,
        p_payment_intent_id: input.paymentIntentId,
        p_customer_email: input.customerEmail,
        p_shipping_address: input.shippingAddress,
        p_paid_amount: input.paidAmount,
        p_currency: input.currency,
      },
    );
    if (error) throw error;
    return z.string().uuid().parse(data);
  }
}
