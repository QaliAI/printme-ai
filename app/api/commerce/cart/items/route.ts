import { type NextRequest, NextResponse } from 'next/server';
import {
  attachCartSessionCookie,
  resolveCartRequestIdentity,
} from '@/lib/commerce/cart-session';
import {
  cartItemRequestSchema,
  commerceCartErrorResponse,
} from '@/lib/commerce/cart-api';
import { CommerceCartService } from '@/lib/commerce/cart-service';
import { SupabaseCommerceCartStore } from '@/lib/commerce/supabase-cart-store';

export async function POST(request: NextRequest) {
  try {
    const identity = await resolveCartRequestIdentity(request);
    const body = cartItemRequestSchema.parse(await request.json());
    const service = new CommerceCartService(
      new SupabaseCommerceCartStore()
    );
    const snapshot = await service.upsertItem(identity, body.snapshot);
    return attachCartSessionCookie(
      NextResponse.json({ snapshot }, { status: 201 }),
      identity
    );
  } catch (error) {
    return commerceCartErrorResponse(error);
  }
}
