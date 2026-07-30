import { type NextRequest, NextResponse } from 'next/server';
import {
  attachCartSessionCookie,
  resolveCartRequestIdentity,
} from '@/lib/commerce/cart-session';
import { commerceCartErrorResponse } from '@/lib/commerce/cart-api';
import { CommerceCartService } from '@/lib/commerce/cart-service';
import { SupabaseCommerceCartStore } from '@/lib/commerce/supabase-cart-store';
import {
  getCommerceE2ESession,
  isCommerceE2ERequest,
  removeE2ECartItem,
} from '@/lib/commerce/testing/e2e-harness';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  if (isCommerceE2ERequest(request)) {
    const { itemId } = await context.params;
    removeE2ECartItem(getCommerceE2ESession(request), itemId);
    return NextResponse.json({ removed: true });
  }
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
