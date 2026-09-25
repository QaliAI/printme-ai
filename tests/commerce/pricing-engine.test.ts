import { describe, expect, it } from 'vitest';
import {
  evaluateVariantPrice,
  recommendTargetPriceCents,
} from '@/lib/commerce/pricing-engine';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';

describe('Server-Owned Pricing Engine', () => {
  const products = getApprovedMerchProducts();
  const poster = products.find((p) => p.id === 'gallery-poster')!;
  const variant = { ...poster.variants[0], unitCost: 750 }; // $7.50 cost

  it('validates a margin-safe price under customer-paid shipping model', () => {
    const evalResult = evaluateVariantPrice({
      product: poster,
      variant,
      shippingCostCents: 599,
    });
    expect(evalResult.valid).toBe(true);
    expect(evalResult.gateFailures).toEqual([]);
    expect(evalResult.contributionProfitCents).toBeGreaterThanOrEqual(800);
    expect(evalResult.contributionMarginPercent).toBeGreaterThanOrEqual(30);
    expect(evalResult.audit.shippingModel).toBe('customer-paid');
  });

  it('rejects pricing when product cost is missing', () => {
    const missingCostVariant = { ...poster.variants[0], unitCost: null };
    const evalResult = evaluateVariantPrice({
      product: poster,
      variant: missingCostVariant,
      shippingCostCents: 599,
    });
    expect(evalResult.valid).toBe(false);
    expect(evalResult.gateFailures).toContainEqual(
      expect.stringContaining('MISSING_PRODUCT_COST'),
    );
  });

  it('rejects pricing when shipping cost is missing', () => {
    const posterNoShipping = {
      ...poster,
      merchandising: { ...poster.merchandising!, shippingCost: null },
    };
    const evalResult = evaluateVariantPrice({
      product: posterNoShipping,
      variant,
      shippingCostCents: null,
    });
    expect(evalResult.valid).toBe(false);
    expect(evalResult.gateFailures).toContainEqual(
      expect.stringContaining('MISSING_SHIPPING_COST'),
    );
  });

  it('rejects stale economics snapshots older than 24 hours', () => {
    const now = new Date('2026-07-31T12:00:00.000Z');
    const staleTime = '2026-07-29T10:00:00.000Z'; // > 48 hours ago
    const evalResult = evaluateVariantPrice({
      product: poster,
      variant,
      shippingCostCents: 599,
      snapshotTimestamp: staleTime,
      now,
    });
    expect(evalResult.valid).toBe(false);
    expect(evalResult.gateFailures).toContainEqual(
      expect.stringContaining('STALE_ECONOMICS_DATA'),
    );
  });

  it('rejects discounts that breach the margin floor', () => {
    const evalResult = evaluateVariantPrice({
      product: poster,
      variant,
      shippingCostCents: 599,
      discountCents: 2000, // $20 discount on $29 item
    });
    expect(evalResult.valid).toBe(false);
    expect(evalResult.gateFailures).toContainEqual(
      expect.stringContaining('DISCOUNT_EXCEEDS_FLOOR'),
    );
  });

  it('evaluates merchant-paid shipping model correctly', () => {
    const evalResult = evaluateVariantPrice({
      product: poster,
      variant: { ...poster.variants[0], unitCost: 750, unitPrice: 3200 },
      shippingCostCents: 599,
      policy: { shippingModel: 'merchant-paid' },
    });
    // $32.00 retail - ($7.50 cost + $5.99 shipping + $1.23 stripe + $2.50 reserve) = $14.78 profit (46.2% margin)
    expect(evalResult.valid).toBe(true);
    expect(evalResult.audit.shippingModel).toBe('merchant-paid');
    expect(evalResult.contributionProfitCents).toBe(1478);
  });

  it('recommends target prices hitting 35%-45% margin targets', () => {
    // For $7.50 cost ($750) + $2.50 reserve ($250) + $0.30 stripe fixed:
    // target 40% margin gives ~$18.00 -> rounds up to 1800
    const recPrice = recommendTargetPriceCents(750, 599, 40, 'customer-paid');
    expect(recPrice).toBeGreaterThanOrEqual(1800);
  });
});
