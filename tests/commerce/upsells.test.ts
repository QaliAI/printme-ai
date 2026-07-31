import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { developmentDesignSeeds } from '@/lib/commerce/designs/seed';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import {
  getSameDesignUpsells,
} from '@/lib/commerce/upsells';
import { calculateBundleQuote } from '@/lib/commerce/bundle-pricing';

function sourceItem() {
  const products = getApprovedMerchProducts();
  const product = products[0];
  const design = developmentDesignSeeds[0];
  return createCartSnapshot({
    id: 'source-item',
    design,
    product,
    configuration: createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    }),
    createdAt: '2026-07-30T12:00:00.000Z',
  });
}

describe('same-design upsells', () => {
  it('hides recommendations while contribution margin is unknown', () => {
    const item = sourceItem();
    expect(
      getSameDesignUpsells({
        sourceItem: item,
        cartItems: [item],
        products: getApprovedMerchProducts(),
      }),
    ).toEqual([]);
  });

  it('recommends only positive-margin products not already in cart', () => {
    const item = sourceItem();
    const products = getApprovedMerchProducts();
    for (const product of products) {
      product.merchandising!.shippingCost = 500;
      for (const variant of product.variants) variant.unitCost = 700;
    }
    const recommendations = getSameDesignUpsells({
      sourceItem: item,
      cartItems: [item],
      products,
    });
    expect(recommendations.map((upsell) => upsell.product.id)).toEqual([
      'everyday-tee',
      'keepsake-mug',
    ]);
    const quote = calculateBundleQuote(
      {
        requestedDiscountRate: 0.1,
        items: [
          {
            designVersion: item.configuration.designVersion,
            productId: item.configuration.merchProductId,
            variantId: products[0].variants[0].id,
            quantity: 1,
          },
          ...recommendations.map((recommendation) => ({
            designVersion: item.configuration.designVersion,
            productId: recommendation.product.id,
            variantId: recommendation.product.variants[0].id,
            quantity: 1,
          })),
        ],
      },
      products,
    );
    expect(quote.eligible).toBe(true);
    expect(quote.discount).toBeGreaterThan(0);
    expect(quote.contributionMarginAfterDiscount).toBeGreaterThan(0);
    expect(quote.freeShippingThreshold).toBeGreaterThan(0);
  });
});
