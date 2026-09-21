import { describe, expect, it } from 'vitest';
import {
  calculateShippingQuote,
  isShippingQuoteValid,
  ShippingQuoteError,
} from '@/lib/commerce/shipping-quote';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { curatedDesigns } from '@/lib/commerce/fixtures';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';

function createMockCartItem(productId: 'gallery-poster' | 'everyday-tee' | 'keepsake-mug', quantity = 1) {
  const design = curatedDesigns[0];
  const products = getApprovedMerchProducts();
  const product = products.find((p) => p.id === productId)!;
  const snapshot = createCartSnapshot({
    id: `item-${productId}`,
    design,
    product,
    configuration: createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    }),
    createdAt: new Date('2026-07-31T12:00:00.000Z').toISOString(),
  });
  return { ...snapshot, quantity };
}

describe('Shipping Quote Flow', () => {
  const validUS = { country: 'US', state: 'NY', postalCode: '10001' };

  it('calculates single-item US standard shipping quote', () => {
    const item = createMockCartItem('gallery-poster', 1);
    const quote = calculateShippingQuote({
      destination: validUS,
      items: [item],
    });

    expect(quote.shippingFeeCents).toBe(599); // $5.99 for 1 poster
    expect(quote.destination).toEqual(validUS);
    expect(quote.shippingMethod).toBe('standard');
  });

  it('calculates multi-item shipping for same provider with first and additional item rates', () => {
    const tee1 = createMockCartItem('everyday-tee', 1); // 1st tee (Monster Digital): $3.99
    const tee2 = createMockCartItem('everyday-tee', 2); // 2 more tees (same provider): 2 * $2.09 = $4.18

    const quote = calculateShippingQuote({
      destination: validUS,
      items: [tee1, tee2],
    });

    // 1st tee ($3.99) + 2 addl tees (2 * $2.09 = $4.18) = 399 + 418 = 817 cents ($8.17)
    expect(quote.shippingFeeCents).toBe(817);
  });

  it('calculates split-provider shipping where each facility ships a separate parcel', () => {
    const poster1 = createMockCartItem('gallery-poster', 1); // Spoke Custom: $5.99
    const tee1 = createMockCartItem('everyday-tee', 1); // Monster Digital: $3.99
    const mug1 = createMockCartItem('keepsake-mug', 1); // District Photo: $6.39

    const quoteTwoProviders = calculateShippingQuote({
      destination: validUS,
      items: [poster1, tee1],
    });
    // Spoke Custom ($5.99) + Monster Digital ($3.99) = 998 cents ($9.98)
    expect(quoteTwoProviders.shippingFeeCents).toBe(998);

    const quoteThreeProviders = calculateShippingQuote({
      destination: validUS,
      items: [poster1, tee1, mug1],
    });
    // Spoke Custom ($5.99) + Monster Digital ($3.99) + District Photo ($6.39) = 1637 cents ($16.37)
    expect(quoteThreeProviders.shippingFeeCents).toBe(1637);
  });

  it('rejects non-US shipping destinations like Canada', () => {
    const canadaDest = { country: 'CA', state: 'ON', postalCode: 'M5V 2T6' };
    const item = createMockCartItem('gallery-poster', 1);

    expect(() =>
      calculateShippingQuote({
        destination: canadaDest,
        items: [item],
      }),
    ).toThrow(ShippingQuoteError);

    try {
      calculateShippingQuote({ destination: canadaDest, items: [item] });
    } catch (err: unknown) {
      expect((err as ShippingQuoteError).code).toBe(
        'UNSUPPORTED_SHIPPING_DESTINATION',
      );
    }
  });

  it('validates quote expiration and cart changes', () => {
    const now = new Date('2026-07-31T12:00:00.000Z');
    const item = createMockCartItem('gallery-poster', 1);
    const quote = calculateShippingQuote({
      destination: validUS,
      items: [item],
      now,
      ttlMinutes: 30,
    });

    // Valid immediately
    expect(isShippingQuoteValid(quote, [item], validUS, now)).toBe(true);

    // Invalid when expired (31 minutes later)
    const later = new Date('2026-07-31T12:31:00.000Z');
    expect(isShippingQuoteValid(quote, [item], validUS, later)).toBe(false);

    // Invalid when cart changes (quantity changed to 2)
    const item2 = { ...item, quantity: 2 };
    expect(isShippingQuoteValid(quote, [item2], validUS, now)).toBe(false);

    // Invalid when destination changes
    const diffUS = { country: 'US', state: 'CA', postalCode: '90210' };
    expect(isShippingQuoteValid(quote, [item], diffUS, now)).toBe(false);
  });
});
