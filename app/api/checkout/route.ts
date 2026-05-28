import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import Stripe from 'stripe';

const checkoutSchema = z.object({
  cartId: z.string().uuid(),
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    const { cartId } = checkoutSchema.parse(body);

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Initialize Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user owns the cart
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select(
        `
        id,
        user_id,
        cart_items (
          id,
          quantity,
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
      .eq('id', cartId)
      .eq('user_id', user.id)
      .single();

    if (cartError || !cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    // Validate cart has items
    if (!cart.cart_items || cart.cart_items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Map cart items to Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.cart_items.map(
      (item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product_variant.product.name,
            images: item.design?.design_url ? [item.design.design_url] : undefined,
          },
          unit_amount:
            (item.product_variant.product.base_price +
              (item.product_variant.price_modifier || 0)) *
            item.quantity,
        },
        quantity: 1,
      })
    );

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/cart`,
      customer_email: user.email,
      metadata: {
        cartId,
        userId: user.id,
      },
    });

    // Store checkout reference in database
    const { error: checkoutError } = await supabase
      .from('checkout_sessions')
      .insert({
        cart_id: cartId,
        stripe_session_id: session.id,
        user_id: user.id,
        status: 'pending',
      });

    if (checkoutError) {
      console.error('Failed to store checkout session:', checkoutError);
    }

    return NextResponse.json({
      sessionId: session.id,
      redirectUrl: session.url,
    });
  } catch (err) {
    console.error('Checkout error:', err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${err.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
