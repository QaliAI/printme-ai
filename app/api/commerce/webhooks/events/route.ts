import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hasCommerceOperationsAccess } from '@/lib/commerce/operations-auth';
import { SupabaseWebhookOperationsStore } from '@/lib/commerce/webhooks/supabase-operations-store';

const querySchema = z.object({
  source: z.enum(['stripe', 'printify']).optional(),
  status: z
    .enum(['received', 'processing', 'processed', 'failed'])
    .optional()
    .default('failed'),
});

export async function GET(request: NextRequest) {
  if (!hasCommerceOperationsAccess(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const query = querySchema.safeParse({
    source: request.nextUrl.searchParams.get('source') ?? undefined,
    status: request.nextUrl.searchParams.get('status') ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json(
      { error: 'Invalid webhook event filters.' },
      { status: 400 },
    );
  }
  try {
    const events = await new SupabaseWebhookOperationsStore().list(
      query.data,
    );
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json(
      { error: 'Webhook operations data is unavailable.' },
      { status: 503 },
    );
  }
}
