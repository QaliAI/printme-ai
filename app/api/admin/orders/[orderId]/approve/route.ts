import { type NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrOperationsAccess } from '@/lib/commerce/admin-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { PrintifyFulfillmentService, getFulfillmentMode } from '@/lib/commerce/fulfillment/service';
import { SupabaseFulfillmentStore } from '@/lib/commerce/fulfillment/supabase-store';
import {
  PrintifyDraftGatewayAdapter,
  PrintifyProductionGatewayAdapter,
} from '@/lib/commerce/fulfillment/printify-gateway';
import { validateOrderArtwork } from '@/lib/commerce/fulfillment/artwork-validator';
import { evaluateOrderEconomics } from '@/lib/commerce/fulfillment/economics-validator';
import { cartConfigurationSnapshotSchema } from '@/lib/commerce/snapshot';
import type { CartConfigurationSnapshot } from '@/lib/commerce/types';

export async function POST(
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

    // 1. Fetch order
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        payment_status,
        fulfillment_status,
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

    if (order.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Cannot approve unpaid order for production.' },
        { status: 400 },
      );
    }

    if (order.production_submitted_at || order.printify_order_id) {
      return NextResponse.json(
        { error: 'Order is already submitted or in production.' },
        { status: 409 },
      );
    }

    // 2. Pre-flight Artwork & Economics check
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

    const artworkAudit = validateOrderArtwork(items);
    if (!artworkAudit.valid) {
      return NextResponse.json(
        {
          error: 'Artwork validation failed. Cannot approve for production.',
          failures: artworkAudit.failures,
        },
        { status: 422 },
      );
    }

    const shippingPaidCents = Math.round(Number(order.shipping ?? 0) * 100);
    const economicsAudit = evaluateOrderEconomics(items, shippingPaidCents);
    if (!economicsAudit.valid) {
      return NextResponse.json(
        {
          error: 'Economics validation failed below margin floor. Cannot approve for production.',
          failures: economicsAudit.blockingReasons,
        },
        { status: 422 },
      );
    }

    // 3. Process fulfillment based on mode
    const mode = getFulfillmentMode();
    const approvedAt = new Date().toISOString();
    const operator = auth.operatorEmail || 'admin-operator';

    // If live or draft mode is enabled with Printify credentials
    if (mode === 'draft' || mode === 'live') {
      const service = new PrintifyFulfillmentService(
        new SupabaseFulfillmentStore(),
        new PrintifyProductionGatewayAdapter(),
        new PrintifyDraftGatewayAdapter(),
      );
      const job = await service.prepare(orderId);

      return NextResponse.json({
        success: true,
        orderId,
        mode,
        job,
        approvedBy: operator,
        approvedAt,
      });
    }

    // In dry-run or disabled mode: mark as approved by operator
    await supabase
      .from('orders')
      .update({
        fulfillment_status: 'manual_review_approved',
        error_message: null,
        updated_at: approvedAt,
      })
      .eq('id', orderId);

    await supabase
      .from('fulfillment_jobs')
      .update({
        state: 'fulfillment_ready',
        locked_at: null,
        locked_by: null,
        updated_at: approvedAt,
      })
      .eq('order_id', orderId);

    return NextResponse.json({
      success: true,
      orderId,
      mode,
      approvedBy: operator,
      approvedAt,
      message:
        'Order successfully verified and approved by operator. (Live Printify submission remains gated until merchant activates live mode).',
    });
  } catch (err) {
    console.error('Error approving order:', err);
    return NextResponse.json(
      { error: 'Internal server error while approving order.' },
      { status: 500 },
    );
  }
}
