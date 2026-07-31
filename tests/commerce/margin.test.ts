import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import {
  calculateContributionMargin,
  getProductCheckoutReadiness,
} from '@/lib/commerce/margin';

describe('product margin and checkout readiness', () => {
  it('refuses to invent margin while provider cost or shipping is missing', () => {
    const product = getApprovedMerchProducts()[0];
    const margin = calculateContributionMargin(product, product.variants[0]);
    expect(margin.complete).toBe(false);
    expect(margin.contributionMargin).toBeNull();
    expect(getProductCheckoutReadiness(product)).toMatchObject({
      ready: false,
    });
  });

  it('uses the full contribution formula when costs are synchronized', () => {
    const product = getApprovedMerchProducts()[0];
    product.variants[0].unitCost = 800;
    product.merchandising!.shippingCost = 500;
    const margin = calculateContributionMargin(product, product.variants[0]);
    expect(margin.complete).toBe(true);
    expect(margin.contributionMargin).toBe(
      margin.retailPrice -
        800 -
        500 -
        margin.stripeFee -
        margin.aiProcessingCost -
        margin.supportReserve,
    );
  });
});
