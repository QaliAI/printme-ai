import { type NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrOperationsAccess } from '@/lib/commerce/admin-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  type OperatorQueueTab,
  resolveOrderLifecycle,
} from '@/lib/commerce/fulfillment/order-lifecycle';
import { cartConfigurationSnapshotSchema } from '@/lib/commerce/snapshot';
import type { CartConfigurationSnapshot } from '@/lib/commerce/types';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminOrOperationsAccess(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filterTab = searchParams.get('tab') as OperatorQueueTab | null;

  try {
    const supabase = getSupabaseAdminClient();

    // 1. Fetch orders with their line items
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        updated_at,
        status,
        payment_status,
        fulfillment_status,
        subtotal,
        shipping,
        tax,
        total,
        paid_amount,
        customer_email,
        shipping_address,
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        printify_order_id,
        production_submitted_at,
        tracking_number,
        tracking_carrier,
        tracking_url,
        shipped_at,
        delivered_at,
        error_message,
        order_items (
          id,
          quantity,
          unit_price,
          configuration_snapshot
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (ordersError) {
      console.error('Error fetching admin orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to retrieve orders from database.', details: ordersError.message },
        { status: 500 },
      );
    }

interface JobRow {
  id: string;
  order_id: string;
  state: string;
  mode: string;
  error_code?: string | null;
  error_message?: string | null;
  retry_classification?: string | null;
  attempt_count?: number;
  printify_order_id?: string | null;
  production_submitted_at?: string | null;
}

    // 2. Fetch associated fulfillment jobs
    const orderIds = (ordersData ?? []).map((o) => o.id);
    let jobsByOrderId: Record<string, JobRow> = {};

    if (orderIds.length > 0) {
      const { data: jobsData } = await supabase
        .from('fulfillment_jobs')
        .select(`
          id,
          order_id,
          state,
          mode,
          error_code,
          error_message,
          retry_classification,
          attempt_count,
          printify_order_id,
          production_submitted_at
        `)
        .in('order_id', orderIds);

      if (jobsData) {
        jobsByOrderId = Object.fromEntries(
          jobsData.map((job) => [job.order_id, job as JobRow]),
        );
      }
    }

    // 3. Resolve lifecycle & tab counts for each order
    const tabCounts: Record<OperatorQueueTab | 'ALL', number> = {
      ALL: 0,
      NEEDS_REVIEW: 0,
      READY_FOR_PRODUCTION: 0,
      BLOCKED: 0,
      SUBMITTED: 0,
      IN_PRODUCTION: 0,
      SHIPPED: 0,
      EXCEPTION: 0,
    };

    const auditedOrders = (ordersData ?? []).map((order) => {
      // Parse snapshots safely
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

      const job = jobsByOrderId[order.id] ?? null;

      const lifecycle = resolveOrderLifecycle({
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        status: order.status,
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
        printify_order_id: order.printify_order_id,
        shipping: order.shipping ? Number(order.shipping) : 0,
        tracking_number: order.tracking_number,
        tracking_carrier: order.tracking_carrier,
        tracking_url: order.tracking_url,
        error_message: order.error_message,
        job,
        items,
      });

      tabCounts.ALL += 1;
      tabCounts[lifecycle.operatorTab] += 1;

      return {
        ...order,
        parsedItems: items,
        job,
        lifecycle,
      };
    });

    // 4. Filter by tab if requested
    const filteredOrders = filterTab && (filterTab as string) !== 'ALL'
      ? auditedOrders.filter((o) => o.lifecycle.operatorTab === filterTab)
      : auditedOrders;

    return NextResponse.json({
      orders: filteredOrders,
      tabCounts,
      totalCount: auditedOrders.length,
      mode: process.env.PRINTIFY_FULFILLMENT_MODE || 'disabled',
    });
  } catch (error) {
    console.error('Unexpected error in admin orders API:', error);
    return NextResponse.json(
      { error: 'Internal server error processing admin orders.' },
      { status: 500 },
    );
  }
}
