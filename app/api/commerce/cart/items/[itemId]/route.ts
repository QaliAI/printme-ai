import { type NextRequest, NextResponse } from 'next/server';
import {
  attachCartSessionCookie,
  resolveCartRequestIdentity,
} from '@/lib/commerce/cart-session';
import { commerceCartErrorResponse } from '@/lib/commerce/cart-api';
import { CommerceCartService } from '@/lib/commerce/cart-service';
import { SupabaseCommerceCartStore } from '@/lib/commerce/supabase-cart-store';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const identity = await resolveCartRequestIdentity(request);
    const { itemId } = await context.params;
    const service = new CommerceCartService(
      new SupabaseCommerceCartStore()
    );
    await service.removeItem(identity, itemId);
    return attachCartSessionCookie(
      NextResponse.json({ removed: true }),
      identity
    );
  } catch (error) {
    return commerceCartErrorResponse(error);
  }
}
