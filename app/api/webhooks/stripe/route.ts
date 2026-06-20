import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { printifyClient } from '@/lib/printify/client';
import { CartItemWithRelations, getFirstOrValue } from '@/lib/types';

// Use placeholder during build if env vars missing - real values needed at request time
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[Stripe Webhook] Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}, ID: ${event.id}`);

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[Stripe Webhook] Processing checkout.session.completed for session: ${session.id}`);

      try {
        // Get checkout session from database
        const { data: checkoutSession } = await supabase
          .from('checkout_sessions')
          .select('*')
          .eq('stripe_session_id', session.id)
          .single();

        if (!checkoutSession) {
          console.error('[Stripe Webhook] Checkout session not found in database:', session.id);
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Idempotency check: Query orders where stripe_session_id = session.id
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_session_id', session.id)
          .maybeSingle();

        if (existingOrder) {
          console.log(`[Stripe Webhook] Idempotency hit: Order already exists (ID: ${existingOrder.id}) for session: ${session.id}`);
          return NextResponse.json({ received: true });
        }

        // Get cart with items and designs
        const { data: cart } = await supabase
          .from('carts')
          .select(
            `
            id,
            user_id,
            cart_items (
              id,
              quantity,
              design_id,
              product_variant:product_variants(
                id,
                price_modifier,
                product:products(
                  id,
                  name,
                  base_price
                )
              ),
              design:generated_designs(
                id,
                design_url
              )
            )
          `
          )
          .eq('id', checkoutSession.cart_id)
          .single();

        if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
          console.error('Cart not found or empty:', checkoutSession.cart_id);
          return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
        }

        // Validate shipping fields before calling Printify / creating order
        const shipping = (session as any).shipping_details;
        const userEmail = session.customer_details?.email;
        const userName = session.customer_details?.name;

        const shippingName = shipping?.name || userName;
        const shippingEmail = userEmail;
        const shippingAddress1 = shipping?.address?.line1;
        const shippingCity = shipping?.address?.city;
        const shippingZip = shipping?.address?.postal_code;
        const shippingCountry = shipping?.address?.country;

        const missingFields: string[] = [];
        if (!shippingName?.trim()) missingFields.push('name');
        if (!shippingEmail?.trim()) missingFields.push('email');
        if (!shippingAddress1?.trim()) missingFields.push('address1');
        if (!shippingCity?.trim()) missingFields.push('city');
        if (!shippingZip?.trim()) missingFields.push('zip');
        if (!shippingCountry?.trim()) missingFields.push('country_code');

        const isShippingValid = missingFields.length === 0;

        // Printify payload validation checks:
        // Validate that each item has a product ID, variant ID, design URL, and valid quantity
        const missingPrintifyDetails: string[] = [];
        cart.cart_items.forEach((item: any, index: number) => {
          const productVariant = getFirstOrValue(item.product_variant);
          const design = getFirstOrValue(item.design);

          const productId = productVariant?.product?.id;
          const variantId = productVariant?.id;
          const designUrl = design?.design_url;
          const quantity = item.quantity;

          if (!productId) missingPrintifyDetails.push(`item[${index}] missing product ID`);
          if (!variantId) missingPrintifyDetails.push(`item[${index}] missing variant ID`);
          if (!designUrl) missingPrintifyDetails.push(`item[${index}] missing design URL`);
          if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
            missingPrintifyDetails.push(`item[${index}] invalid quantity: ${quantity}`);
          }
        });

        const isPrintifyPayloadValid = missingPrintifyDetails.length === 0;

        // Calculate order total
        let total = 0;
        (cart.cart_items as CartItemWithRelations[]).forEach((item) => {
          const productVariant = getFirstOrValue(item.product_variant);
          const itemPrice =
            (productVariant?.product?.base_price || 0) +
            (productVariant?.price_modifier || 0);
          total += itemPrice * item.quantity;
        });

        // Determine status, error message, and if we should submit to Printify based on safety configuration
        const isLiveMode = session.livemode;
        const autoSubmitLive = process.env.PRINTIFY_AUTO_SUBMIT_LIVE_ORDERS === 'true';
        const createDraftLive = process.env.PRINTIFY_CREATE_DRAFT_IN_LIVE_MODE === 'true';

        let shouldSubmitToPrintify = isShippingValid && isPrintifyPayloadValid;
        let orderStatus = 'pending_fulfillment';
        let orderErrorMessage = null;

        if (!isShippingValid || !isPrintifyPayloadValid) {
          shouldSubmitToPrintify = false;
          orderStatus = 'needs_review';
          const reasons = [];
          if (missingFields.length > 0) {
            reasons.push(`Missing shipping details: ${missingFields.join(', ')}`);
          }
          if (missingPrintifyDetails.length > 0) {
            reasons.push(`Invalid Printify payload: ${missingPrintifyDetails.join(', ')}`);
          }
          orderErrorMessage = `Fulfillment blocked: ${reasons.join(' | ')}`;
        } else if (isLiveMode && !autoSubmitLive && !createDraftLive) {
          // Live mode safety check: draft or auto-submit not configured, flag for manual review
          shouldSubmitToPrintify = false;
          orderStatus = 'needs_review';
          orderErrorMessage = 'Manual review required: Live order auto-submission and draft creation are disabled.';
        }

        // Create order
        let orderInsertResult = await supabase
          .from('orders')
          .insert({
            user_id: cart.user_id,
            total_amount: Math.round(total * 100),
            status: orderStatus,
            stripe_session_id: session.id,
            error_message: orderErrorMessage,
          })
          .select()
          .single();

        // Fallback in case 'needs_review' is not allowed in the database constraint
        if (orderInsertResult.error && orderStatus === 'needs_review') {
          console.warn('[Stripe Webhook] Failed to insert order with status needs_review, trying pending_fulfillment fallback:', orderInsertResult.error);
          orderInsertResult = await supabase
            .from('orders')
            .insert({
              user_id: cart.user_id,
              total_amount: Math.round(total * 100),
              status: 'pending_fulfillment',
              stripe_session_id: session.id,
              error_message: orderErrorMessage,
            })
            .select()
            .single();
        }

        const { data: order, error: orderError } = orderInsertResult;

        if (orderError || !order) {
          console.error('[Stripe Webhook] Failed to create order:', orderError);
          throw new Error('Failed to create order');
        }

        // Create order items
        const orderItems = cart.cart_items.map((item: any) => ({
          order_id: order.id,
          design_id: item.design_id,
          product_id: item.product_variant.product.id,
          product_variant_id: item.product_variant.id,
          quantity: item.quantity,
          unit_price:
            item.product_variant.product.base_price +
            (item.product_variant.price_modifier || 0),
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('[Stripe Webhook] Failed to create order items:', itemsError);
          throw new Error('Failed to create order items');
        }

        // Update checkout session status
        await supabase
          .from('checkout_sessions')
          .update({ status: 'completed', order_id: order.id })
          .eq('stripe_session_id', session.id);

        // Submit to Printify only if allowed and safety checks pass
        if (shouldSubmitToPrintify) {
          try {
            const printifyOrder = await submitToPrintify(
              cart,
              order,
              session
            );

            // Update order with Printify order ID and new status if live auto-submitted
            if (printifyOrder) {
              const nextStatus = (isLiveMode && autoSubmitLive) ? 'submitted_to_printify' : 'pending_fulfillment';
              await supabase
                .from('orders')
                .update({
                  printify_order_id: printifyOrder.id,
                  status: nextStatus
                })
                .eq('id', order.id);
            }
          } catch (printifyError) {
            console.error('[Stripe Webhook] Error submitting to Printify:', printifyError);
            const errMsg = printifyError instanceof Error ? printifyError.message : String(printifyError);
            await supabase
              .from('orders')
              .update({
                status: 'needs_review',
                error_message: `Printify submission failed: ${errMsg}`,
              })
              .eq('id', order.id);
          }
        } else {
          console.log('[Stripe Webhook] Skipping Printify submission. Reason:', orderErrorMessage || 'Fulfillment bypassed.');
        }

        // Clear cart items
        await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', checkoutSession.cart_id);

        console.log('[Stripe Webhook] Order created successfully:', order.id);
      } catch (error) {
        console.error('[Stripe Webhook] Error processing checkout:', error);
        return NextResponse.json(
          { error: 'Failed to process checkout' },
          { status: 500 }
        );
      }
    }

    // Return success for all webhook events
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Webhook error:', err);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function submitToPrintify(
  cart: any,
  order: any,
  stripeSession: Stripe.Checkout.Session
) {
  const userEmail = stripeSession.customer_details?.email || 'customer@example.com';
  const userName = stripeSession.customer_details?.name || 'Customer';
  const shipping = (stripeSession as any).shipping_details;

  // Split name into first and last name for Printify
  const nameParts = (shipping?.name || userName).trim().split(/\s+/);
  const first_name = nameParts[0] || 'Customer';
  const last_name = nameParts.slice(1).join(' ') || 'Customer';

  // Build Printify order from cart items
  const lineItems = (cart.cart_items as CartItemWithRelations[]).map((item) => {
    const productVariant = getFirstOrValue(item.product_variant);
    const design = getFirstOrValue(item.design);

    // Convert printify_variant_id to integer if available
    const variantIdStr = productVariant?.printify_variant_id || '';
    const variant_id = parseInt(variantIdStr, 10) || 0;

    return {
      product_id: productVariant?.product?.printify_blueprint_id || '',
      variant_id: variant_id,
      quantity: item.quantity,
      files: [
        {
          type: 'front' as const,
          url: design?.design_url || '',
        },
      ],
    };
  });

  const address_to = {
    first_name,
    last_name,
    email: userEmail,
    phone: stripeSession.customer_details?.phone || '',
    address1: shipping?.address?.line1 || '',
    address2: shipping?.address?.line2 || '',
    city: shipping?.address?.city || '',
    region: shipping?.address?.state || '',
    zip: shipping?.address?.postal_code || '',
    country: shipping?.address?.country || 'US',
  };

  const printifyPayload = {
    external_id: order.id,
    line_items: lineItems,
    address_to,
    shipping_method: 1, // Default standard shipping method
  };

  const isLiveMode = stripeSession.livemode;
  const autoSubmitLive = process.env.PRINTIFY_AUTO_SUBMIT_LIVE_ORDERS === 'true';

  if (!isLiveMode) {
    console.log('[Printify] Stripe Checkout Session is in test mode. Creating DRAFT order on Printify.');
    return printifyClient.createDraftOrder(printifyPayload);
  }

  if (autoSubmitLive) {
    console.log('[Printify] Live auto-submit enabled. Creating and CONFIRMING order on Printify.');
    return printifyClient.submitOrder(printifyPayload);
  }

  // Conservative default: Create as draft in live mode
  console.log('[Printify] Creating DRAFT order on Printify for live session.');
  return printifyClient.createDraftOrder(printifyPayload);
}
