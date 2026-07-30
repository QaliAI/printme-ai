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
import { validateSnapshotAgainstApprovedCatalog } from '@/lib/commerce/catalog/validation';
import {
  getCommerceE2ESession,
  isCommerceE2ERequest,
  upsertE2ECartItem,
} from '@/lib/commerce/testing/e2e-harness';
import { cartConfigurationSnapshotSchema } from '@/lib/commerce/snapshot';

export async function POST(request: NextRequest) {
  if (isCommerceE2ERequest(request)) {
    try {
      const body = cartItemRequestSchema.parse(await request.json());
      const snapshot = cartConfigurationSnapshotSchema.parse(
        body.snapshot,
      );
      await validateSnapshotAgainstApprovedCatalog(snapshot);
      return NextResponse.json(
        {
          snapshot: upsertE2ECartItem(
            getCommerceE2ESession(request),
            snapshot,
          ),
        },
        { status: 201 },
      );
    } catch (error) {
      return commerceCartErrorResponse(error);
    }
  }
  try {
    const identity = await resolveCartRequestIdentity(request);
    const body = cartItemRequestSchema.parse(await request.json());
    const service = new CommerceCartService(
      new SupabaseCommerceCartStore(),
      undefined,
      validateSnapshotAgainstApprovedCatalog
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
