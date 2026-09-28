import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  calculateShippingQuote,
  ShippingQuoteError,
} from '@/lib/commerce/shipping-quote';
import { cartConfigurationSnapshotSchema } from '@/lib/commerce/snapshot';

const requestSchema = z.object({
  items: z.array(cartConfigurationSnapshotSchema).min(1),
  destination: z
    .object({
      country: z.literal('US'),
      state: z.string().length(2).toUpperCase(),
      postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { items, destination } = requestSchema.parse(json);

    const quote = calculateShippingQuote({
      destination: destination ?? {
        country: 'US',
        state: 'NY',
        postalCode: '10001',
      },
      items,
    });

    return NextResponse.json({
      success: true,
      shippingFeeCents: quote.shippingFeeCents,
      carrierName: quote.carrierName,
      estimatedDeliveryDays: quote.estimatedDeliveryDays,
      shippingMethod: quote.shippingMethod,
      quoteId: quote.quoteId,
    });
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid shipping quote request parameters', details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to calculate shipping quote' },
      { status: 500 },
    );
  }
}
