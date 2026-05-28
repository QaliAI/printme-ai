import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

interface PrintifyWebhookEvent {
  type: string;
  data: {
    id: string;
    status: string;
    shipping_method?: string;
    tracking_number?: string;
    items?: Array<{
      id: string;
      status: string;
    }>;
  };
}

const statusMap: Record<string, string> = {
  draft: 'pending_fulfillment',
  confirmed: 'processing',
  production: 'processing',
  shipping: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
  failed: 'cancelled',
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const event: PrintifyWebhookEvent = payload;

    // Verify the webhook is from Printify
    // In production, you'd verify the signature using Printify's webhook secret
    const printifyWebhookSecret = process.env.PRINTIFY_WEBHOOK_SECRET;
    if (!printifyWebhookSecret) {
      console.warn('PRINTIFY_WEBHOOK_SECRET not configured');
    }

    switch (event.type) {
      case 'order:updated':
        return await handleOrderUpdate(event.data);

      case 'order:confirmed':
      case 'order:production':
      case 'order:shipped':
      case 'order:delivered':
        return await handleOrderStatusChange(event.type, event.data);

      case 'order:failed':
        return await handleOrderFailed(event.data);

      default:
        console.log(`Unhandled Printify event type: ${event.type}`);
        return Response.json({ received: true });
    }
  } catch (error) {
    console.error('Printify webhook error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}

async function handleOrderUpdate(data: PrintifyWebhookEvent['data']) {
  try {
    const printifyOrderId = data.id;

    const { data: orderData, error: queryError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('printify_order_id', printifyOrderId)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      throw queryError;
    }

    if (!orderData) {
      console.warn(`No order found for Printify order ID: ${printifyOrderId}`);
      return Response.json({ received: true });
    }

    const newStatus = statusMap[data.status] || data.status;

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        tracking_number: data.tracking_number || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderData.id);

    if (updateError) {
      throw updateError;
    }

    console.log(
      `Updated order ${orderData.id} from Printify order ${printifyOrderId} to status ${newStatus}`
    );
    return Response.json({ received: true });
  } catch (error) {
    console.error('Error handling order update:', error);
    throw error;
  }
}

async function handleOrderStatusChange(
  eventType: string,
  data: PrintifyWebhookEvent['data']
) {
  try {
    const printifyOrderId = data.id;
    const statusKey = eventType.split(':')[1];
    const newStatus = statusMap[statusKey] || data.status;

    const { data: orderData, error: queryError } = await supabase
      .from('orders')
      .select('id')
      .eq('printify_order_id', printifyOrderId)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      throw queryError;
    }

    if (!orderData) {
      console.warn(`No order found for Printify order ID: ${printifyOrderId}`);
      return Response.json({ received: true });
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderData.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`Updated order ${orderData.id} to status ${newStatus}`);
    return Response.json({ received: true });
  } catch (error) {
    console.error('Error handling status change:', error);
    throw error;
  }
}

async function handleOrderFailed(data: PrintifyWebhookEvent['data']) {
  try {
    const printifyOrderId = data.id;

    const { data: orderData, error: queryError } = await supabase
      .from('orders')
      .select('id')
      .eq('printify_order_id', printifyOrderId)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      throw queryError;
    }

    if (!orderData) {
      console.warn(`No order found for Printify order ID: ${printifyOrderId}`);
      return Response.json({ received: true });
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderData.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`Cancelled order ${orderData.id} due to Printify failure`);
    return Response.json({ received: true });
  } catch (error) {
    console.error('Error handling order failure:', error);
    throw error;
  }
}
