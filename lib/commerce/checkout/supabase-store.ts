import 'server-only';

import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { cartConfigurationSnapshotSchema } from '../snapshot';
import type {
  CheckoutAttempt,
  CheckoutIdentity,
  CheckoutStore,
} from './service';

const cartRowSchema = z.object({
  id: z.string().uuid(),
  cart_items: z.array(
    z.object({ configuration_snapshot: z.unknown() }),
  ),
});

const attemptRowSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  stripe_session_id: z.string().nullable(),
  stripe_checkout_url: z.string().nullable(),
  status: z.string(),
  user_id: z.string().uuid().nullable(),
  guest_token_hash: z.string().nullable(),
});

function toAttempt(value: unknown): CheckoutAttempt {
  const row = attemptRowSchema.parse(value);
  return {
    orderId: row.order_id,
    checkoutId: row.id,
    stripeSessionId: row.stripe_session_id,
    redirectUrl: row.stripe_checkout_url,
    status: row.status,
  };
}

function assertCheckoutPersistence() {
  if (
    process.env.COMMERCE_CHECKOUT_ENABLED !== 'true' ||
    process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true'
  ) {
    throw new Error('Secure checkout persistence is disabled.');
  }
}

export class SupabaseCheckoutStore implements CheckoutStore {
  private get client() {
    assertCheckoutPersistence();
    return getSupabaseAdminClient();
  }

  async loadActiveCart(identity: CheckoutIdentity) {
    let query = this.client
      .from('carts')
      .select(
        'id,cart_items(configuration_snapshot)',
      )
      .eq('status', 'active');
    query = identity.userId
      ? query.eq('user_id', identity.userId)
      : query.eq('guest_token_hash', identity.guestTokenHash);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const cart = cartRowSchema.parse(data);
    return {
      id: cart.id,
      items: cart.cart_items.map((item) =>
        cartConfigurationSnapshotSchema.parse(item.configuration_snapshot),
      ),
    };
  }

  async findAttempt(
    identity: CheckoutIdentity,
    idempotencyKey: string,
  ) {
    let query = this.client
      .from('commerce_checkout_sessions')
      .select(
        'id,order_id,stripe_session_id,stripe_checkout_url,status,user_id,guest_token_hash',
      )
      .eq('idempotency_key', idempotencyKey);
    query = identity.userId
      ? query.eq('user_id', identity.userId)
      : query.eq('guest_token_hash', identity.guestTokenHash);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? toAttempt(data) : null;
  }

  async loadPendingOrderItems(orderId: string) {
    const { data, error } = await this.client
      .from('order_items')
      .select('configuration_snapshot')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return z
      .array(z.object({ configuration_snapshot: z.unknown() }))
      .parse(data ?? [])
      .map((item) =>
        cartConfigurationSnapshotSchema.parse(item.configuration_snapshot),
      );
  }

  async createPendingOrder(
    input: Parameters<CheckoutStore['createPendingOrder']>[0],
  ) {
    const { data, error } = await this.client.rpc(
      'create_commerce_pending_order',
      {
        p_cart_id: input.cart.id,
        p_user_id: input.identity.userId ?? null,
        p_guest_token_hash: input.identity.guestTokenHash,
        p_idempotency_key: input.idempotencyKey,
        p_subtotal: input.subtotal,
        p_currency: input.currency,
      },
    );
    if (error) throw error;
    const result = z
      .array(
        z.object({
          order_id: z.string().uuid(),
          checkout_id: z.string().uuid(),
        }),
      )
      .min(1)
      .parse(data)[0];
    return {
      orderId: result.order_id,
      checkoutId: result.checkout_id,
      stripeSessionId: null,
      redirectUrl: null,
      status: 'pending',
    };
  }

  async attachStripeSession(
    input: Parameters<CheckoutStore['attachStripeSession']>[0],
  ) {
    const { error } = await this.client.rpc(
      'attach_commerce_stripe_session',
      {
        p_checkout_id: input.checkoutId,
        p_order_id: input.orderId,
        p_stripe_session_id: input.stripeSessionId,
        p_stripe_checkout_url: input.redirectUrl,
      },
    );
    if (error) throw error;
  }
}
