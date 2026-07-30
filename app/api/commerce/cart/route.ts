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
  getE2ECart,
  isCommerceE2ERequest,
} from '@/lib/commerce/testing/e2e-harness';

export async function GET(request: NextRequest) {
  if (isCommerceE2ERequest(request)) {
    return NextResponse.json({
      schemaVersion: 2,
      items: getE2ECart(getCommerceE2ESession(request)),
    });
  }
  try {
    const identity = await resolveCartRequestIdentity(request);
    const service = new CommerceCartService(
      new SupabaseCommerceCartStore()
    );
    const items = await service.getItems(identity);
    return attachCartSessionCookie(
      NextResponse.json({ schemaVersion: 2, items }),
      identity
    );
  } catch (error) {
    return commerceCartErrorResponse(error);
  }
}
