import 'server-only';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getTransactionalEmailService } from './email-service';

const confirmationSchema = z.object({
  orderId: z.string().uuid(), orderNumber: z.string().min(1),
  recipientEmail: z.email(), recipientName: z.string(),
  items: z.array(z.object({ title: z.string(), quantity: z.number().int().positive(), unitPriceCents: z.number().int().nonnegative() })).min(1),
  subtotalCents: z.number().int().nonnegative(), shippingCents: z.number().int().nonnegative(),
  taxCents: z.number().int().nonnegative(), totalCents: z.number().int().nonnegative(), currency: z.string(),
});

/** Recoverable after receipt acknowledgement or a lost server response. */
export async function deliverOrderConfirmation(orderId: string) {
  if (process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true') throw new Error('Notification persistence disabled.');
  const { data, error } = await getSupabaseAdminClient().from('commerce_notification_outbox')
    .select('status,payload').eq('idempotency_key', `order-confirmed-${orderId}`).single();
  if (error) throw error;
  if (data.status === 'sent') return { success: true };
  return getTransactionalEmailService().sendOrderConfirmation(confirmationSchema.parse(data.payload));
}
