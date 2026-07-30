import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CommercePersistenceError } from './supabase-cart-store';

export const cartItemRequestSchema = z.object({
  snapshot: z.unknown(),
});

export function commerceCartErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid commerce configuration snapshot.' },
      { status: 400 }
    );
  }

  if (error instanceof CommercePersistenceError) {
    return NextResponse.json(
      {
        error: 'Persistent cart storage is not available.',
        code: 'COMMERCE_MIGRATION_REQUIRED',
      },
      { status: 503 }
    );
  }

  if (
    error instanceof Error &&
    error.message.startsWith('Commerce persistence requires')
  ) {
    return NextResponse.json(
      {
        error: 'Persistent cart storage is not configured.',
        code: 'COMMERCE_DATABASE_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: 'Commerce cart request failed.' },
    { status: 500 }
  );
}
