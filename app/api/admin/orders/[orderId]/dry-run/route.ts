import { type NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrOperationsAccess } from '@/lib/commerce/admin-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  buildPrintifyFulfillmentPayload,
  hashFulfillmentPayload,
  redactFulfillmentPayload,
} from '@/lib/commerce/fulfillment/payload';
import { validateOrderArtwork } from '@/lib/commerce/fulfillment/artwork-validator';
import { evaluateOrderEconomics } from '@/lib/commerce/fulfillment/economics-validator';
import { cartConfigurationSnapshotSchema } from '@/lib/commerce/snapshot';
import type { CartConfigurationSnapshot } from '@/lib/commerce/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const auth = await verifyAdminOrOperationsAccess(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { orderId } = await context.params;

  try {
    const supabase = getSupabaseAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        payment_status,
        customer_email,
        shipping_address,
        shipping,
        printify_order_id,
        production_submitted_at,
        order_items (
          id,
          quantity,
          unit_price,
          configuration_snapshot
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 },
      );
    }

    const items: CartConfigurationSnapshot[] = (order.order_items ?? [])
      .map((item: { configuration_snapshot: unknown }) => {
        try {
          return cartConfigurationSnapshotSchema.parse(
            item.configuration_snapshot,
          );
        } catch {
          return null;
        }
      })
      .filter((item): item is CartConfigurationSnapshot => item !== null);

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Order has no valid configured items.' },
        { status: 400 },
      );
    }

    const artworkAudit = validateOrderArtwork(items);
    const shippingPaidCents = Math.round(Number(order.shipping ?? 0) * 100);
    const economicsAudit = evaluateOrderEconomics(items, shippingPaidCents);

    // Try building the actual Printify payload
    let printifyPayload: unknown = null;
    let payloadHash: string | null = null;
    let redactedPayload: unknown = null;
    let payloadGenerationError: string | null = null;

    try {
      const rawAddress = order.shipping_address as {
        name?: string;
        line1?: string;
        line2?: string | null;
        city?: string;
        state?: string | null;
        postal_code?: string;
        country?: string;
        phone?: string;
      } | null;

      const fulfillmentOrder = {
        id: order.id,
        paymentStatus: 'paid' as const,
        customerEmail: order.customer_email || 'customer@printme.ai',
        shippingAddress: {
          name: rawAddress?.name || 'Valued Customer',
          line1: rawAddress?.line1 || '123 Main St',
          line2: rawAddress?.line2 ?? null,
          city: rawAddress?.city || 'Chicago',
          state: rawAddress?.state ?? 'IL',
          postal_code: rawAddress?.postal_code || '60601',
          country: rawAddress?.country || 'US',
          phone: rawAddress?.phone || '',
        },
        items,
        printifyOrderId: order.printify_order_id,
        productionSubmittedAt: order.production_submitted_at,
      };

      const payload = buildPrintifyFulfillmentPayload(fulfillmentOrder);
      printifyPayload = payload;
      payloadHash = hashFulfillmentPayload(payload);
      redactedPayload = redactFulfillmentPayload(payload);
    } catch (err) {
      payloadGenerationError =
        err instanceof Error ? err.message : 'Failed to generate Printify payload.';
    }

    const isReadyForSubmission =
      artworkAudit.valid &&
      economicsAudit.valid &&
      payloadGenerationError === null;

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      dryRunTimestamp: new Date().toISOString(),
      isReadyForSubmission,
      payload: printifyPayload,
      payloadHash,
      redactedPayload,
      payloadGenerationError,
      artworkAudit,
      economicsAudit,
      printifyEndpoint: 'https://api.printify.com/v1/shops/{shop_id}/orders.json',
    });
  } catch (err) {
    console.error('Error generating dry run payload:', err);
    return NextResponse.json(
      { error: 'Internal server error executing dry run.' },
      { status: 500 },
    );
  }
}
