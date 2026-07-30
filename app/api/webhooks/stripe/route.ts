import { type NextRequest, NextResponse } from 'next/server';
import {
  StripeCheckoutWebhookService,
  verifyStripeWebhookPayload,
} from '@/lib/commerce/checkout/stripe-webhook';
import { SupabaseStripeWebhookStore } from '@/lib/commerce/checkout/supabase-webhook-store';
import {
  getFulfillmentMode,
  PrintifyFulfillmentService,
} from '@/lib/commerce/fulfillment/service';
import { SupabaseFulfillmentStore } from '@/lib/commerce/fulfillment/supabase-store';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing Stripe webhook authentication.' },
      { status: 400 },
    );
  }
  if (
    process.env.COMMERCE_CHECKOUT_ENABLED !== 'true' ||
    !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
  ) {
    return NextResponse.json(
      { error: 'Stripe test checkout is disabled.' },
      { status: 503 },
    );
  }

  let event;
  try {
    event = verifyStripeWebhookPayload(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid Stripe signature.' },
      { status: 400 },
    );
  }

  try {
    const result = await new StripeCheckoutWebhookService(
      new SupabaseStripeWebhookStore(),
    ).process(event);
    let fulfillment = 'not_requested';
    if (
      result.orderId &&
      getFulfillmentMode() !== 'disabled'
    ) {
      try {
        const job = await new PrintifyFulfillmentService(
          new SupabaseFulfillmentStore(),
        ).prepare(result.orderId);
        fulfillment = job.state;
      } catch {
        fulfillment = 'validation_failed';
      }
    }
    return NextResponse.json({
      received: true,
      duplicate: result.duplicate,
      fulfillment,
    });
  } catch {
    return NextResponse.json(
      { error: 'Stripe event processing failed.' },
      { status: 500 },
    );
  }
}
