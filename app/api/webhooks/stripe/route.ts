import { type NextRequest, NextResponse } from 'next/server';
import {
  isStripeEventModeMismatch,
  StripeCheckoutWebhookService,
  verifyStripeWebhookPayload,
} from '@/lib/commerce/checkout/stripe-webhook';
import { SupabaseStripeWebhookStore } from '@/lib/commerce/checkout/supabase-webhook-store';
import {
  getFulfillmentMode,
  PrintifyFulfillmentService,
} from '@/lib/commerce/fulfillment/service';
import { SupabaseFulfillmentStore } from '@/lib/commerce/fulfillment/supabase-store';
import {
  PrintifyDraftGatewayAdapter,
  PrintifyProductionGatewayAdapter,
} from '@/lib/commerce/fulfillment/printify-gateway';
import { trackServerCommerceEvent } from '@/lib/commerce/analytics-server';
import {
  E2EFulfillmentStore,
  E2EStripeWebhookStore,
  isCommerceE2ERequest,
} from '@/lib/commerce/testing/e2e-harness';
import { deliverOrderConfirmation } from '@/lib/notifications/order-confirmation';

export async function POST(request: NextRequest) {
  const e2eRequest = isCommerceE2ERequest(request);
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing Stripe webhook authentication.' },
      { status: 400 },
    );
  }
  const isLiveMode = process.env.STRIPE_MODE === 'live';
  const hasValidKey = isLiveMode
    ? process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')
    : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');

  if (
    !e2eRequest &&
    (process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true' || !hasValidKey)
  ) {
    return NextResponse.json(
      {
        error: isLiveMode
          ? 'Live Stripe checkout requires COMMERCE_PERSISTENCE_ENABLED=true.'
          : 'Stripe test checkout is disabled.',
      },
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
  if (isStripeEventModeMismatch(event)) {
    return NextResponse.json(
      { error: 'Stripe event mode does not match this deployment.' },
      { status: 400 },
    );
  }

  try {
    const result = await new StripeCheckoutWebhookService(
      e2eRequest
        ? new E2EStripeWebhookStore()
        : new SupabaseStripeWebhookStore(),
    ).process(event);
    let fulfillment = 'not_requested';
    if (
      result.orderId &&
      getFulfillmentMode() !== 'disabled'
    ) {
      try {
        const job = await new PrintifyFulfillmentService(
          e2eRequest
            ? new E2EFulfillmentStore()
            : new SupabaseFulfillmentStore(),
          e2eRequest ? undefined : new PrintifyProductionGatewayAdapter(),
          e2eRequest ? undefined : new PrintifyDraftGatewayAdapter(),
        ).prepare(result.orderId);
        fulfillment = job.state;
      } catch {
        fulfillment = 'validation_failed';
        await trackServerCommerceEvent('fulfillment_failed', {
          orderId: result.orderId,
          stage: 'prepare',
        });
      }
    }
    if (result.orderId && !result.duplicate) {
      await trackServerCommerceEvent('purchase', {
        orderId: result.orderId,
        source: 'stripe_webhook',
      });

      if (!e2eRequest) {
        try { await deliverOrderConfirmation(result.orderId); }
        catch { console.error('[Stripe Webhook] Durable confirmation pending for order', result.orderId); }
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
