import { describe, expect, it } from 'vitest';
import {
  ADAPTATION_COST_STORAGE_KEY,
  planProductAdaptation,
  recordAdaptationCost,
} from '@/lib/commerce/product-adaptation';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';

describe('product adaptation planning', () => {
  const products = getApprovedMerchProducts();

  it('creates optional product-specific plans for all supported kinds', () => {
    const plans = products.map((product) =>
      planProductAdaptation(product, product.variants[0]),
    );
    expect(plans.map((plan) => plan.kind)).toEqual([
      'poster-composition',
      'apparel-breathing-room',
      'mug-handle-safe',
    ]);
    expect(plans.every((plan) => plan.optional && plan.automated)).toBe(true);
  });

  it('keeps a bounded zero-cost transformation log', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    recordAdaptationCost(storage, {
      designId: 'design-1',
      derivativeId: 'derivative-1',
      productId: 'everyday-tee',
      kind: 'apparel-breathing-room',
      provider: 'deterministic-browser',
      amountUsd: 0,
      createdAt: '2026-07-30T12:00:00.000Z',
    });
    expect(JSON.parse(values.get(ADAPTATION_COST_STORAGE_KEY)!)).toHaveLength(
      1,
    );
  });
});
