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
  return createCartSnapshot({
    id: `item-${productId}`,
    design,
    product,
    configuration: createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    }),
    quantity,
    createdAt: new Date('2026-07-31T12:00:00.000Z').toISOString(),
  });
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

  it('calculates multi-item shipping with first and additional item rates', () => {
    const poster1 = createMockCartItem('gallery-poster'); // 1st item: $5.99
    const tee1 = createMockCartItem('everyday-tee'); // addl item: $2.09

    const quote = calculateShippingQuote({
      destination: validUS,
      items: [poster1, tee1],
    });

    // 1st poster ($5.99) + 1st tee as additional ($2.09) = 599 + 209 = 808 cents ($8.08)
    expect(quote.shippingFeeCents).toBe(808);
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
