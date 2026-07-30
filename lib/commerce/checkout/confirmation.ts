import 'server-only';

import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface CheckoutConfirmation {
  orderId: string;
  paymentStatus: string;
  verified: boolean;
}

export async function getCheckoutConfirmation(
  stripeSessionId: string,
): Promise<CheckoutConfirmation | null> {
  if (
    process.env.COMMERCE_CHECKOUT_ENABLED !== 'true' ||
    process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true'
  ) {
    return null;
  }

  const client = getSupabaseAdminClient();
  const { data: checkout, error: checkoutError } = await client
    .from('commerce_checkout_sessions')
    .select('order_id,status')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();
  if (checkoutError) throw checkoutError;
  if (!checkout) return null;
  const checkoutRow = z
    .object({ order_id: z.string().uuid(), status: z.string() })
    .parse(checkout);
  const { data: order, error: orderError } = await client
    .from('orders')
    .select('id,payment_status')
    .eq('id', checkoutRow.order_id)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return null;
  const orderRow = z
    .object({ id: z.string().uuid(), payment_status: z.string() })
    .parse(order);
  return {
    orderId: orderRow.id,
    paymentStatus: orderRow.payment_status,
    verified:
      checkoutRow.status === 'paid' && orderRow.payment_status === 'paid',
  };
}
