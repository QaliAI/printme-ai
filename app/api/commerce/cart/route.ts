import { type NextRequest, NextResponse } from 'next/server';
import {
  attachCartSessionCookie,
  resolveCartRequestIdentity,
} from '@/lib/commerce/cart-session';
import { commerceCartErrorResponse } from '@/lib/commerce/cart-api';
import { CommerceCartService } from '@/lib/commerce/cart-service';
import { SupabaseCommerceCartStore } from '@/lib/commerce/supabase-cart-store';

export async function GET(request: NextRequest) {
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
