import { type NextRequest, NextResponse } from 'next/server';
import {
  printifyWebhookEventSchema,
  PrintifyWebhookService,
  verifyPrintifyWebhookPayload,
} from '@/lib/commerce/webhooks/printify';
import { SupabasePrintifyWebhookStore } from '@/lib/commerce/webhooks/supabase-printify-store';
import { SupabaseFulfillmentStore } from '@/lib/commerce/fulfillment/supabase-store';
import {
  E2EFulfillmentStore,
  isCommerceE2ERequest,
} from '@/lib/commerce/testing/e2e-harness';
import { getTransactionalEmailService } from '@/lib/notifications/email-service';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-pfy-signature');
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json(
      { error: 'Missing Printify webhook authentication.' },
      { status: 401 },
    );
  }

  const rawBody = await request.text();
  if (!verifyPrintifyWebhookPayload(rawBody, signature, secret)) {
    return NextResponse.json(
      { error: 'Invalid Printify signature.' },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Malformed Printify payload.' },
      { status: 400 },
    );
  }
  const event = printifyWebhookEventSchema.safeParse(payload);
  if (!event.success) {
    return NextResponse.json(
      { error: 'Malformed Printify payload.' },
      { status: 400 },
    );
  }

  try {
    const result = await new PrintifyWebhookService(
      new SupabasePrintifyWebhookStore(),
    ).process(event.data);

    // If shipment event with tracking information, send shipping confirmation email to the REAL customer
    if (
      !result.duplicate &&
      result.outcome === 'applied' &&
      result.orderId &&
      (event.data.type === 'order:shipment:created' || event.data.type === 'order:updated')
    ) {
      const carrierData = event.data.resource.data?.carrier;
      if (carrierData?.tracking_number) {
        try {
          const e2eRequest = isCommerceE2ERequest(request);
          const fulfillmentStore = e2eRequest
            ? new E2EFulfillmentStore()
            : new SupabaseFulfillmentStore();
          const paidOrder = await fulfillmentStore.loadPaidOrder(result.orderId);

          if (paidOrder && paidOrder.customerEmail) {
            const emailService = getTransactionalEmailService();
            const recipientName =
              (paidOrder.shippingAddress as Record<string, string | undefined>)?.name ||
              'Valued Customer';
            const shippedItems =
              paidOrder.items && paidOrder.items.length > 0
                ? paidOrder.items.map((it) => ({
                    title: it.designTitle
                      ? `${it.productTitle} (${it.designTitle})`
                      : it.productTitle,
                    variantTitle: it.variantTitle || undefined,
                    quantity: it.quantity,
                  }))
                : [{ title: 'PrintMe Custom Merchandise', quantity: 1 }];

            const emailResult = await emailService.sendOrderShipped({
              orderId: result.orderId,
              orderNumber: `PM-${result.orderId.slice(0, 8).toUpperCase()}`,
              recipientEmail: paidOrder.customerEmail,
              recipientName,
              carrier: (carrierData.code || 'Standard Carrier').toUpperCase(),
              trackingNumber: carrierData.tracking_number,
              trackingUrl: carrierData.tracking_url,
              shippedItems,
            });

            if (!emailResult.success) {
              console.error(
                `[Printify Webhook] Shipping email delivery failed: ${emailResult.error}`,
              );
            }
          } else {
            console.warn(
              `[Printify Webhook] Shipping notification skipped: No customer email found for PrintMe order ${result.orderId}.`,
            );
          }
        } catch (emailErr) {
          console.warn('[Printify Webhook] Shipping email dispatch failed:', emailErr);
        }
      }
    }

    return NextResponse.json({
      received: true,
      duplicate: result.duplicate,
      outcome: result.outcome,
    });
  } catch {
    return NextResponse.json(
      { error: 'Printify event processing failed.' },
      { status: 500 },
    );
  }
}
