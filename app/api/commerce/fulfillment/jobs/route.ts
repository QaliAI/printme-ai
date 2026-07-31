import { type NextRequest, NextResponse } from 'next/server';
import { hasCommerceOperationsAccess } from '@/lib/commerce/operations-auth';
import { SupabaseFulfillmentStore } from '@/lib/commerce/fulfillment/supabase-store';

export async function GET(request: NextRequest) {
  if (!hasCommerceOperationsAccess(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const requested = request.nextUrl.searchParams.get('state');
  const states = requested
    ? requested.split(',').map((state) => state.trim()).filter(Boolean)
    : [
        'paid',
        'fulfillment_failed',
        'dry_run_complete',
        'fulfillment_ready',
      ];
  try {
    const jobs = await new SupabaseFulfillmentStore().listOperationalJobs(
      states,
    );
    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json(
      { error: 'Fulfillment operations data is unavailable.' },
      { status: 503 },
    );
  }
}
