import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import Stripe from 'stripe';
import { CartItemWithRelations, getFirstOrValue } from '@/lib/types';
import { trackEvent } from '@/lib/analytics';
import crypto from 'crypto';

const checkoutSchema = z.object({
  cartId: z.string().uuid().optional(),
  guestItems: z.array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1),
      designUrl: z.string().url(),
      originalImageUrl: z.string().url(),
      styleId: z.string().uuid(),
    })
  ).optional(),
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    const { cartId, guestItems } = checkoutSchema.parse(body);

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

    let finalUserId: string;
    let finalCartId: string;
    let finalCustomerEmail: string | undefined;

    const user = await getCurrentUser();
    if (user) {
      // Authenticated checkout path
      if (!cartId) {
        return NextResponse.json({ error: 'Cart ID required for signed-in users' }, { status: 400 });
      }

      finalUserId = user.id;
      finalCustomerEmail = user.email;
      finalCartId = cartId;

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

      if (!cart.cart_items || cart.cart_items.length === 0) {
        return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
      }
    } else {
      // Guest checkout path: dynamically create a unique guest account
      if (!guestItems || guestItems.length === 0) {
        return NextResponse.json({ error: 'Guest items required' }, { status: 400 });
      }

      const guestEmail = `guest-${crypto.randomUUID()}@guest.printme.ai`;
      const guestPassword = crypto.randomUUID();
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: guestEmail,
        password: guestPassword,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        console.error('Failed to create guest user:', authError);
        return NextResponse.json({ error: 'Failed to create guest session' }, { status: 500 });
      }

      const guestUser = authData.user;
      finalUserId = guestUser.id;
      finalCustomerEmail = undefined;

      // Fetch or insert guest cart (cart trigger might auto-create it, let's verify/create)
      let { data: cartRecord } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', guestUser.id)
        .maybeSingle();

      if (!cartRecord) {
        const { data: newCart, error: newCartError } = await supabase
          .from('carts')
          .insert({ user_id: guestUser.id })
          .select()
          .single();

        if (newCartError) {
          console.error('Failed to create cart for guest:', newCartError);
          return NextResponse.json({ error: 'Failed to initialize cart' }, { status: 500 });
        }
        cartRecord = newCart;
      }

      if (!cartRecord) {
        return NextResponse.json({ error: 'Failed to initialize cart' }, { status: 500 });
      }

      finalCartId = cartRecord.id;

      // Create guest database records for design + upload + cart item
      for (const item of guestItems) {
        // Insert user_upload
        const { data: uploadRecord, error: uploadError } = await supabase
          .from('user_uploads')
          .insert({
            user_id: guestUser.id,
            original_file_name: 'upload.png',
            original_url: item.originalImageUrl,
            file_size: 1000000,
          })
          .select()
          .single();

        if (uploadError) {
          console.error('Failed to create upload for guest:', uploadError);
          return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
        }

        // Insert generated_design
        const { data: designRecord, error: designError } = await supabase
          .from('generated_designs')
          .insert({
            upload_id: uploadRecord.id,
            style_preset_id: item.styleId,
            user_id: guestUser.id,
            original_image_url: item.originalImageUrl,
            design_url: item.designUrl,
            status: 'completed',
          })
          .select()
          .single();

        if (designError) {
          console.error('Failed to create design for guest:', designError);
          return NextResponse.json({ error: 'Failed to process design' }, { status: 500 });
        }

        // Insert cart_item
        const { error: cartItemError } = await supabase
          .from('cart_items')
          .insert({
            cart_id: finalCartId,
            design_id: designRecord.id,
            product_variant_id: item.variantId,
            quantity: item.quantity,
          });

        if (cartItemError) {
          console.error('Failed to add item to cart for guest:', cartItemError);
          return NextResponse.json({ error: 'Failed to save cart item' }, { status: 500 });
        }
      }
    }

    // Query cart data with items to map to Stripe line items
    const { data: cartData, error: queryError } = await supabase
      .from('carts')
      .select(
        `
        id,
        user_id,
        cart_items (
          id,
          quantity,
          product_variant_id,
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
      .eq('id', finalCartId)
      .single();

    if (queryError || !cartData || !cartData.cart_items || cartData.cart_items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty or not found' }, { status: 400 });
    }

    // Map cart items to Stripe line items
    const lineItems = [];
    for (const item of cartData.cart_items as unknown as CartItemWithRelations[]) {
      const productVariant = getFirstOrValue(item.product_variant);
      const design = getFirstOrValue(item.design);
      const basePrice = Number(productVariant?.product?.base_price || 0);
      const modifier = Number(productVariant?.price_modifier || 0);
      const unitAmountCents = Math.round((basePrice + modifier) * 100);

      // Validation
      if (!Number.isFinite(unitAmountCents) || !Number.isInteger(unitAmountCents) || unitAmountCents <= 0) {
        return NextResponse.json(
          { error: `Invalid price calculated for variant ${item.product_variant_id || 'unknown'}` },
          { status: 400 }
        );
      }

      if (!Number.isFinite(item.quantity) || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for variant ${item.product_variant_id || 'unknown'}` },
          { status: 400 }
        );
      }

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: productVariant?.product?.name || 'Product',
            images: design?.design_url ? [design.design_url] : undefined,
          },
          unit_amount: unitAmountCents,
        },
        quantity: item.quantity,
      });
    }

    console.log(`[Stripe Checkout] Initiating session creation for user: ${finalUserId}, cart: ${finalCartId}. Items count: ${lineItems.length}`);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      phone_number_collection: {
        enabled: true,
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/cart`,
      customer_email: finalCustomerEmail,
      metadata: {
        cartId: finalCartId,
        userId: finalUserId,
        isGuest: user ? 'false' : 'true',
      },
    });

    console.log(`[Stripe Checkout] Session successfully created: ${session.id}`);

    // Store checkout reference in database
    const { error: checkoutError } = await supabase
      .from('checkout_sessions')
      .insert({
        cart_id: finalCartId,
        stripe_session_id: session.id,
        user_id: finalUserId,
        status: 'pending',
      });

    if (checkoutError) {
      console.error('Failed to store checkout session:', checkoutError);
    }

    // Track checkout_started event
    await trackEvent({
      userId: finalUserId,
      eventName: 'checkout_started',
      properties: {
        cartId: finalCartId,
        sessionId: session.id,
        itemsCount: lineItems.length,
      },
    });

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
