import { type NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrOperationsAccess } from '@/lib/commerce/admin-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { summarizeFunnel } from '@/lib/commerce/funnel-summary';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminOrOperationsAccess(request);
  if (!auth.authorized) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  if (process.env.COMMERCE_ANALYTICS_ENABLED !== 'true') return NextResponse.json({ error: 'Commerce analytics is not enabled.' }, { status: 503 });
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
    const db = getSupabaseAdminClient();
    const events = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      const page = await db.from('analytics_events').select('event_name, properties').gte('created_at', since).order('created_at').range(offset, offset + 999);
      if (page.error) throw new Error('Analytics migration required.');
      events.push(...page.data);
      if (page.data.length < 1000) break;
    }
    const orders = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      const page = await db.from('orders').select('paid_amount').eq('payment_status', 'paid').gte('created_at', since).order('created_at').range(offset, offset + 999);
      if (page.error) throw new Error('Commerce migration required.');
      orders.push(...page.data);
      if (page.data.length < 1000) break;
    }
    return NextResponse.json({ ...summarizeFunnel(events, orders), period: 'Trailing 30 days', sampled: events.length === 10000 || orders.length === 10000 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Analytics storage is unavailable. Verify the committed commerce migrations.' }, { status: 503 });
  }
}
