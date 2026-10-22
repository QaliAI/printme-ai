import { type NextRequest, NextResponse } from 'next/server';
import { hasCommerceOperationsAccess } from '@/lib/commerce/operations-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { assertCommerceRecoverySchema } from '@/lib/commerce/schema-readiness';

/** Small authenticated monitoring surface; no customer data or raw payloads. */
export async function GET(request: NextRequest) {
  if (!hasCommerceOperationsAccess(request)) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  if (process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true') return NextResponse.json({ error: 'Persistence disabled.' }, { status: 503 });
  try {
    await assertCommerceRecoverySchema();
    const client = getSupabaseAdminClient();
    const staleAt = new Date(Date.now() - 5 * 60_000).toISOString();
    const results = await Promise.all([
      client.from('commerce_webhook_events').select('id', { count: 'exact', head: true }).eq('receipt_status', 'failed'),
      client.from('commerce_webhook_events').select('id', { count: 'exact', head: true }).eq('receipt_status', 'processing').lt('last_attempted_at', staleAt),
      client.from('fulfillment_jobs').select('id', { count: 'exact', head: true }).in('state', ['paid','fulfillment_failed','preparing_fulfillment','fulfillment_submitting']),
      client.from('commerce_notification_outbox').select('id', { count: 'exact', head: true }).neq('status', 'sent'),
      client.from('commerce_payment_holds').select('payment_intent_id', { count: 'exact', head: true }),
    ]);
    if (results.some(result => result.error)) throw new Error('Monitoring query failed.');
    return NextResponse.json({
      failedReceipts: results[0].count, staleReceipts: results[1].count,
      fulfillmentNeedsAttention: results[2].count, unsentNotifications: results[3].count,
      paymentHolds: results[4].count,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Commerce monitoring unavailable.' }, { status: 503 });
  }
}
