import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  attachCartSessionCookie,
  resolveCartRequestIdentity,
} from '@/lib/commerce/cart-session';
import {
  CheckoutValidationError,
  SecureCheckoutService,
} from '@/lib/commerce/checkout/service';
import { SupabaseCheckoutStore } from '@/lib/commerce/checkout/supabase-store';
import { StripeTestCheckoutGateway } from '@/lib/commerce/checkout/stripe-gateway';
import { getCuratedCatalogService } from '@/lib/commerce/catalog/catalog-service';

export async function POST(request: NextRequest) {
  try {
    const identity = await resolveCartRequestIdentity(request);
    const service = new SecureCheckoutService(
      new SupabaseCheckoutStore(),
      new StripeTestCheckoutGateway(),
      getCuratedCatalogService(),
    );
    const attempt = await service.create(identity, await request.json());
    return attachCartSessionCookie(
      NextResponse.json(attempt, { status: 201 }),
      identity,
    );
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return NextResponse.json(
        { error: 'Checkout validation failed.', code: error.code },
        { status: 409 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid checkout request.' },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('disabled') ||
      message.includes('requires a Stripe test-mode')
    ) {
      return NextResponse.json(
        {
          error: 'Test checkout is unavailable until its safe gates are enabled.',
          code: 'CHECKOUT_DISABLED',
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'Unable to create test checkout.' },
      { status: 500 },
    );
  }
}
