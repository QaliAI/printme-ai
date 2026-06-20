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
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      try {
        // Get checkout session from database
        const { data: checkoutSession } = await supabase
          .from('checkout_sessions')
          .select('*')
          .eq('stripe_session_id', session.id)
          .single();

        if (!checkoutSession) {
          console.error('Checkout session not found:', session.id);
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Idempotency check: Query orders where stripe_session_id = session.id
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_session_id', session.id)
          .maybeSingle();

        if (existingOrder) {
          console.log('Stripe checkout session already processed (order exists):', session.id);
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

        // Calculate order total
        let total = 0;
        (cart.cart_items as CartItemWithRelations[]).forEach((item) => {
          const productVariant = getFirstOrValue(item.product_variant);
          const itemPrice =
            (productVariant?.product?.base_price || 0) +
            (productVariant?.price_modifier || 0);
          total += itemPrice * item.quantity;
        });

        // Determine status and error message
        const orderStatus = isShippingValid ? 'pending_fulfillment' : 'needs_review';
        const orderErrorMessage = isShippingValid
          ? null
          : `Fulfillment blocked: Missing required shipping fields: ${missingFields.join(', ')}`;

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
        if (orderInsertResult.error && !isShippingValid) {
          console.warn('Failed to insert order with status needs_review, trying pending_fulfillment fallback:', orderInsertResult.error);
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
          console.error('Failed to create order:', orderError);
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
          console.error('Failed to create order items:', itemsError);
          throw new Error('Failed to create order items');
        }

        // Update checkout session status
        await supabase
          .from('checkout_sessions')
          .update({ status: 'completed', order_id: order.id })
          .eq('stripe_session_id', session.id);

        // Submit to Printify only if shipping is valid
        if (isShippingValid) {
          try {
            const printifyOrder = await submitToPrintify(
              cart,
              order,
              session
            );

            // Update order with Printify order ID
            if (printifyOrder) {
              await supabase
                .from('orders')
                .update({ printify_order_id: printifyOrder.id })
                .eq('id', order.id);
            }
          } catch (printifyError) {
            console.error('Error submitting to Printify:', printifyError);
            // Record the error message in the order database for manual admin review
            const errMsg = printifyError instanceof Error ? printifyError.message : String(printifyError);
            await supabase
              .from('orders')
              .update({
                error_message: `Printify submission failed: ${errMsg}`,
              })
              .eq('id', order.id);
          }
        } else {
          console.log('Skipping Printify submission because shipping validation failed:', orderErrorMessage);
        }

        // Clear cart items
        await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', checkoutSession.cart_id);

        console.log('Order created successfully:', order.id);
      } catch (error) {
        console.error('Error processing checkout:', error);
        return NextResponse.json(
          { error: 'Failed to process checkout' },
          { status: 500 }
        );
      }
    }

    // Return success for all webhook events
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
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
  // Get user's Stripe customer email as fallback contact info
  const userEmail = stripeSession.customer_details?.email || 'customer@example.com';
  const userName = stripeSession.customer_details?.name || 'Customer';
  const shipping = (stripeSession as any).shipping_details;

  // Build Printify order from cart items
  const lineItems = (cart.cart_items as CartItemWithRelations[]).map((item) => {
    const productVariant = getFirstOrValue(item.product_variant);
    const design = getFirstOrValue(item.design);
    return {
      product_id: productVariant?.product?.id || '',
      variant_ids: [productVariant?.id || ''],
      quantity: item.quantity,
      files: [
        {
          type: 'front' as const,
          url: design?.design_url,
        },
      ],
    };
  });

  const recipient = {
    name: shipping?.name || userName,
    email: userEmail,
    phone: stripeSession.customer_details?.phone || '',
    address1: shipping?.address?.line1 || '',
    address2: shipping?.address?.line2 || '',
    city: shipping?.address?.city || '',
    state: shipping?.address?.state || '',
    zip: shipping?.address?.postal_code || '',
    country_code: shipping?.address?.country || 'US',
  };

  // Safe mode: Submit as DRAFT order if in Stripe test mode to avoid auto-submitting live production orders
  if (!stripeSession.livemode) {
    console.log('Stripe Checkout Session is in test mode. Creating DRAFT order on Printify.');
    return printifyClient.createDraftOrder({
      recipient,
      line_items: lineItems,
    });
  }

  // Create Printify order and auto-confirm for production (live mode only)
  const printifyOrder = await printifyClient.submitOrder({
    recipient,
    line_items: lineItems,
  });

  return printifyOrder;
}
