import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StripeCheckoutWebhookService } from '@/lib/commerce/checkout/stripe-webhook';
import { SupabaseStripeWebhookStore } from '@/lib/commerce/checkout/supabase-webhook-store';
import { hasCommerceOperationsAccess } from '@/lib/commerce/operations-auth';
import { PrintifyWebhookService } from '@/lib/commerce/webhooks/printify';
import { SupabasePrintifyWebhookStore } from '@/lib/commerce/webhooks/supabase-printify-store';

const paramsSchema = z.object({
  source: z.enum(['stripe', 'printify']),
  eventId: z.string().min(1).max(300),
});

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ source: string; eventId: string }>;
  },
) {
  if (!hasCommerceOperationsAccess(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json(
      { error: 'Invalid webhook replay target.' },
      { status: 400 },
    );
  }

  try {
    const result =
      params.data.source === 'stripe'
        ? await new StripeCheckoutWebhookService(
            new SupabaseStripeWebhookStore(),
          ).replay(params.data.eventId)
        : await new PrintifyWebhookService(
            new SupabasePrintifyWebhookStore(),
          ).replay(params.data.eventId);
    return NextResponse.json({
      replayed: !result.duplicate,
      duplicate: result.duplicate,
    });
  } catch {
    return NextResponse.json(
      { error: 'Webhook replay failed.' },
      { status: 500 },
    );
  }
}
