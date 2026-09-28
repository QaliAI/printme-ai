import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { curatedDesigns } from '@/lib/commerce/fixtures';
import { evaluateOrderEconomics } from '@/lib/commerce/fulfillment/economics-validator';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import {
  cartConfigurationSnapshotPayloadSchema,
  finalizeConfigurationSnapshot,
} from '@/lib/commerce/snapshot';
import { getPreviewTemplate } from '@/lib/commerce/templates';

function createSnapshotForItem(
  productId: string,
  variantId: number,
  unitPriceOverride?: number,
) {
  const design = curatedDesigns[0];
  const products = getApprovedMerchProducts();
  const product = products.find((p) => p.id === productId)!;
  const variant = product.variants.find((v) => v.printifyVariantId === variantId)!;

  const config = createProductConfiguration({
    designId: design.id,
    design: design.asset,
    product,
    template: getPreviewTemplate(product.previewTemplateId),
  });

  const snapshot = createCartSnapshot({
    id: `item-${productId}-${variantId}`,
    design,
    product,
    configuration: config,
    createdAt: '2026-09-24T12:00:00.000Z',
  });

  const payload = cartConfigurationSnapshotPayloadSchema.parse(snapshot);
  return finalizeConfigurationSnapshot({
    ...payload,
    configuration: {
      ...payload.configuration,
      printifyVariantId: variantId,
      unitPrice: unitPriceOverride ?? variant.unitPrice,
      productionAssetUrl: 'https://assets.printme.ai/production/sample.png',
    },
  });
}

describe('Economics & Margin Floor Validator', () => {
  it('verifies that all launch products pass the $8.00 and 30% margin floor', () => {
    const launchVariants = [
      { productId: 'gallery-poster', variantId: 43138 }, // 12x18
      { productId: 'gallery-poster', variantId: 43144 }, // 18x24
      { productId: 'everyday-tee', variantId: 18541 },   // Tee M
      { productId: 'everyday-tee', variantId: 18542 },   // Tee L
      { productId: 'keepsake-mug', variantId: 33719 },   // Mug 11oz
    ];

    for (const v of launchVariants) {
      const item = createSnapshotForItem(v.productId, v.variantId);
      const audit = evaluateOrderEconomics([item]);

      expect(audit.valid).toBe(true);
      expect(audit.passesMarginFloor).toBe(true);
      expect(audit.blockingReasons).toHaveLength(0);
      expect(audit.netContributionProfitCents).toBeGreaterThanOrEqual(800);
      expect(audit.contributionMarginPercent).toBeGreaterThanOrEqual(30);
    }
  });

  it('blocks an item that is underpriced and falls below the $8.00 profit floor', () => {
    // Everyday Tee priced at $15.00 instead of $34.00
    // Cost is $9.20. With fees ($0.74) + reserve ($2.50) = $12.44. Profit = $2.56 (< $8.00 floor)
    const underpricedItem = createSnapshotForItem('everyday-tee', 18541, 1500);
    const audit = evaluateOrderEconomics([underpricedItem]);

    expect(audit.valid).toBe(false);
    expect(audit.passesMarginFloor).toBe(false);
    expect(
      audit.blockingReasons.some((r) => r.includes('MARGIN_BELOW_PROFIT_FLOOR')),
    ).toBe(true);
  });

  it('blocks an item if the gross margin percentage falls below 30%', () => {
    // Poster priced at $16.00 with cost $11.50 -> margin is ~11% (< 30%)
    const lowMarginItem = createSnapshotForItem('gallery-poster', 43144, 1600);
    const audit = evaluateOrderEconomics([lowMarginItem]);

    expect(audit.valid).toBe(false);
    expect(
      audit.blockingReasons.some((r) => r.includes('MARGIN_BELOW_PERCENT_FLOOR')),
    ).toBe(true);
  });

  it('correctly aggregates multi-item orders', () => {
    const item1 = createSnapshotForItem('gallery-poster', 43138); // $29.00
    const item2 = createSnapshotForItem('everyday-tee', 18541);   // $34.00

    const audit = evaluateOrderEconomics([item1, item2], 599);

    expect(audit.itemsTotalRetailCents).toBe(6300);
    expect(audit.shippingPaidCents).toBe(599);
    expect(audit.grossRevenueCents).toBe(6899);
    expect(audit.passesMarginFloor).toBe(true);
    expect(audit.itemEvaluations).toHaveLength(2);
    expect(audit.valid).toBe(true);
  });
});
