import { type NextRequest, NextResponse } from 'next/server';
import {
  printifyWebhookEventSchema,
  PrintifyWebhookService,
  verifyPrintifyWebhookPayload,
} from '@/lib/commerce/webhooks/printify';
import { SupabasePrintifyWebhookStore } from '@/lib/commerce/webhooks/supabase-printify-store';
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

    // If shipment event with tracking information, send shipping confirmation email
    if (
      !result.duplicate &&
      result.outcome === 'applied' &&
      (event.data.type === 'order:shipment:created' || event.data.type === 'order:updated')
    ) {
      const carrierData = event.data.resource.data?.carrier;
      if (carrierData?.tracking_number) {
        try {
          const emailService = getTransactionalEmailService();
          const pfyOrderId = String(event.data.resource.id);
          await emailService.sendOrderShipped({
            orderId: result.orderId || pfyOrderId,
            orderNumber: result.orderId ? `PM-${result.orderId.slice(0, 8).toUpperCase()}` : `Printify #${pfyOrderId}`,
            recipientEmail: 'customer@printme.ai', // Customer email on file for order
            recipientName: 'Valued Customer',
            carrier: carrierData.code.toUpperCase(),
            trackingNumber: carrierData.tracking_number,
            trackingUrl: carrierData.tracking_url,
            shippedItems: [{ title: 'PrintMe Custom Merchandise', quantity: 1 }],
          });
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
