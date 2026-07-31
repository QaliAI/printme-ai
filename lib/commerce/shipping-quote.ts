import 'server-only';

import { z } from 'zod';
import type { CartConfigurationSnapshot } from './types';
import { createHash } from 'node:crypto';

export const shippingDestinationSchema = z.object({
  country: z.literal('US'),
  state: z.string().length(2).toUpperCase(),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
});

export type ShippingDestination = z.infer<typeof shippingDestinationSchema>;

export const shippingQuoteSchema = z.object({
  quoteId: z.string(),
  destination: shippingDestinationSchema,
  shippingFeeCents: z.number().int().nonnegative(),
  shippingMethod: z.literal('standard'),
  carrierName: z.string(),
  estimatedDeliveryDays: z.number().int().positive(),
  expiresAt: z.string().datetime({ offset: true }),
  cartHash: z.string(),
});

export type ShippingQuote = z.infer<typeof shippingQuoteSchema>;

export class ShippingQuoteError extends Error {
  constructor(readonly code: string, message?: string) {
    super(message ?? `Shipping quote error: ${code}`);
    this.name = 'ShippingQuoteError';
  }
}

export const US_SHIPPING_RATES_BY_BLUEPRINT: Record<
  number,
  { firstItemCents: number; additionalItemCents: number }
> = {
  282: { firstItemCents: 599, additionalItemCents: 39 }, // Poster
  12: { firstItemCents: 399, additionalItemCents: 209 }, // Tee
  68: { firstItemCents: 639, additionalItemCents: 299 }, // Mug
};

export function computeCartHash(items: CartConfigurationSnapshot[]): string {
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const payload = sorted
    .map(
      (item) =>
        `${item.configuration.merchProductId}:${item.configuration.printifyVariantId}:${item.quantity}`,
    )
    .join('|');
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export function calculateShippingQuote(input: {
  destination: unknown;
  items: CartConfigurationSnapshot[];
  now?: Date;
  ttlMinutes?: number;
}): ShippingQuote {
  const now = input.now ?? new Date();
  const ttlMinutes = input.ttlMinutes ?? 30;

  // 1. Validate destination
  const destinationResult = shippingDestinationSchema.safeParse(input.destination);
  if (!destinationResult.success) {
    const rawCountry = (input.destination as { country?: string })?.country;
    if (rawCountry && rawCountry !== 'US') {
      throw new ShippingQuoteError(
        'UNSUPPORTED_SHIPPING_DESTINATION',
        'Only United States shipping is supported at launch.',
      );
    }
    throw new ShippingQuoteError(
      'INVALID_DESTINATION_ADDRESS',
      'Valid US 2-letter state and 5-digit ZIP code are required.',
    );
  }
  const destination = destinationResult.data;

  if (input.items.length === 0) {
    throw new ShippingQuoteError('EMPTY_CART', 'Cart has no items to quote.');
  }

  // 2. Multi-item calculation (group by provider / blueprint)
  // For split-provider / multi-product scenarios: highest first-item rate pays first-item cost, all remaining items pay additional-item cost.
  let highestFirstItemRate = 0;
  let highestFirstItemBlueprint = 0;

  for (const item of input.items) {
    const blueprintId = item.configuration.printifyBlueprintId;
    const rates = US_SHIPPING_RATES_BY_BLUEPRINT[blueprintId] ?? {
      firstItemCents: 500,
      additionalItemCents: 250,
    };
    if (rates.firstItemCents > highestFirstItemRate) {
      highestFirstItemRate = rates.firstItemCents;
      highestFirstItemBlueprint = blueprintId;
    }
  }

  let totalShippingFeeCents = 0;
  let firstItemClaimed = false;

  // Sort items so the item with the highest first-item rate gets processed first
  const sortedItems = [...input.items].sort((a, b) => {
    const aRates = US_SHIPPING_RATES_BY_BLUEPRINT[a.configuration.printifyBlueprintId]?.firstItemCents ?? 500;
    const bRates = US_SHIPPING_RATES_BY_BLUEPRINT[b.configuration.printifyBlueprintId]?.firstItemCents ?? 500;
    return bRates - aRates;
  });

  for (const item of sortedItems) {
    const blueprintId = item.configuration.printifyBlueprintId;
    const rates = US_SHIPPING_RATES_BY_BLUEPRINT[blueprintId] ?? {
      firstItemCents: 500,
      additionalItemCents: 250,
    };

    let quantityRemaining = item.quantity;
    if (!firstItemClaimed) {
      totalShippingFeeCents += rates.firstItemCents;
      quantityRemaining -= 1;
      firstItemClaimed = true;
    }

    if (quantityRemaining > 0) {
      totalShippingFeeCents += quantityRemaining * rates.additionalItemCents;
    }
  }

  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();
  const cartHash = computeCartHash(input.items);
  const quoteId = `sq_${cartHash}_${now.getTime()}`;

  return shippingQuoteSchema.parse({
    quoteId,
    destination,
    shippingFeeCents: totalShippingFeeCents,
    shippingMethod: 'standard',
    carrierName: 'Standard Ground Shipping',
    estimatedDeliveryDays: 10,
    expiresAt,
    cartHash,
  });
}

export function isShippingQuoteValid(
  quote: ShippingQuote,
  items: CartConfigurationSnapshot[],
  destination: unknown,
  now = new Date(),
): boolean {
  if (new Date(quote.expiresAt).getTime() <= now.getTime()) {
    return false;
  }

  const parsedDest = shippingDestinationSchema.safeParse(destination);
  if (!parsedDest.success) return false;

  if (
    parsedDest.data.country !== quote.destination.country ||
    parsedDest.data.state !== quote.destination.state ||
    parsedDest.data.postalCode !== quote.destination.postalCode
  ) {
    return false;
  }

  return computeCartHash(items) === quote.cartHash;
}
