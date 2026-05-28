import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const addItemsSchema = z.object({
  designId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    const { designId, items } = addItemsSchema.parse(body);

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user owns the design
    const { data: design, error: designError } = await supabase
      .from('generated_designs')
      .select('id')
      .eq('id', designId)
      .eq('user_id', user.id)
      .single();

    if (designError || !design) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    // Get or create cart
    let { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cartError && cartError.code === 'PGRST116') {
      // No cart exists, create one
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create cart' },
          { status: 500 }
        );
      }
      cart = newCart;
    } else if (cartError) {
      return NextResponse.json(
        { error: 'Failed to fetch cart' },
        { status: 500 }
      );
    }

    // Add items to cart
    const cartItems = items.map((item) => ({
      cart_id: cart!.id,
      design_id: designId,
      product_variant_id: item.variantId,
      quantity: item.quantity,
    }));

    const { error: insertError } = await supabase
      .from('cart_items')
      .insert(cartItems);

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to add items to cart' },
        { status: 500 }
      );
    }

    // Return updated cart
    const { data: updatedCart } = await supabase
      .from('carts')
      .select(
        `
        id,
        user_id,
        created_at,
        cart_items (
          id,
          quantity,
          product_variant_id,
          design_id
        )
      `
      )
      .eq('id', cart!.id)
      .single();

    return NextResponse.json(updatedCart);
  } catch (err) {
    console.error('Add to cart error:', err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add items to cart' },
      { status: 500 }
    );
  }
}
