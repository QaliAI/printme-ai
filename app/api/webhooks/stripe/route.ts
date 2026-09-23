import { type NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
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
import {
  getTransactionalEmailService,
  type OrderEmailItem,
  type ShippingAddressSummary,
} from '@/lib/notifications/email-service';

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
    ? process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') &&
      process.env.STRIPE_LIVE_RELEASE_APPROVED === 'true'
    : process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');

  if (
    !e2eRequest &&
    (process.env.COMMERCE_CHECKOUT_ENABLED !== 'true' || !hasValidKey)
  ) {
    return NextResponse.json(
      {
        error: isLiveMode
          ? 'Live Stripe checkout requires COMMERCE_CHECKOUT_ENABLED=true and STRIPE_LIVE_RELEASE_APPROVED=true.'
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

      // Send Order Confirmation Email asynchronously and safely using REAL order details
      try {
        const sessionObj = event.data.object as Stripe.Checkout.Session;
        const fulfillmentStore = e2eRequest
          ? new E2EFulfillmentStore()
          : new SupabaseFulfillmentStore();
        const paidOrder = await fulfillmentStore.loadPaidOrder(result.orderId);

        const customerEmail =
          paidOrder?.customerEmail ||
          sessionObj.customer_details?.email ||
          sessionObj.customer_email;

        if (customerEmail) {
          const emailService = getTransactionalEmailService();
          const shippingDetails = sessionObj.collected_information?.shipping_details;
          const rawAddress = (paidOrder?.shippingAddress || shippingDetails?.address) as
            | Record<string, string | null | undefined>
            | undefined;

          const recipientName =
            (paidOrder?.shippingAddress as Record<string, string | undefined>)?.name ||
            sessionObj.customer_details?.name ||
            shippingDetails?.name ||
            'Valued Customer';

          // Format actual purchased items from the persisted order
          const emailItems: OrderEmailItem[] =
            paidOrder?.items && paidOrder.items.length > 0
              ? paidOrder.items.map((item) => ({
                  title: item.designTitle
                    ? `${item.productTitle} (${item.designTitle})`
                    : item.productTitle,
                  variantTitle: item.variantTitle || undefined,
                  quantity: item.quantity,
                  unitPriceCents: item.configuration.unitPrice,
                  artworkThumbnailUrl: item.configuration.instantPreview?.url || undefined,
                }))
              : [
                  {
                    title: 'PrintMe Custom Merchandise',
                    quantity: 1,
                    unitPriceCents: sessionObj.amount_subtotal || sessionObj.amount_total || 0,
                  },
                ];

          const shippingAddressSummary: ShippingAddressSummary | null =
            rawAddress && rawAddress.line1
              ? {
                  name: rawAddress.name || recipientName,
                  address1: rawAddress.line1,
                  address2: rawAddress.line2 || null,
                  city: rawAddress.city || '',
                  state: rawAddress.state || null,
                  postalCode: (rawAddress.postal_code || rawAddress.postalCode || '') as string,
                  country: rawAddress.country || 'US',
                }
              : null;

          const subtotalCents =
            sessionObj.amount_subtotal ??
            Math.max(
              0,
              (sessionObj.amount_total || 0) -
                (sessionObj.total_details?.amount_shipping || 0) -
                (sessionObj.total_details?.amount_tax || 0),
            );

          const emailResult = await emailService.sendOrderConfirmation({
            orderId: result.orderId,
            orderNumber: `PM-${result.orderId.slice(0, 8).toUpperCase()}`,
            recipientEmail: customerEmail,
            recipientName,
            items: emailItems,
            subtotalCents,
            shippingCents: sessionObj.total_details?.amount_shipping || 0,
            taxCents: sessionObj.total_details?.amount_tax || 0,
            totalCents: sessionObj.amount_total || 0,
            currency: (sessionObj.currency || 'USD').toUpperCase(),
            shippingAddress: shippingAddressSummary,
          });

          if (!emailResult.success) {
            console.error(
              `[Stripe Webhook] Order confirmation email delivery failed: ${emailResult.error}`,
            );
          }
        }
      } catch (emailErr) {
        console.warn('[Stripe Webhook] Order confirmation email dispatch failed:', emailErr);
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
