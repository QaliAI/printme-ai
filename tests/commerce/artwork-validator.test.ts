import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { curatedDesigns } from '@/lib/commerce/fixtures';
import {
  validateItemArtwork,
  validateOrderArtwork,
} from '@/lib/commerce/fulfillment/artwork-validator';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import {
  cartConfigurationSnapshotPayloadSchema,
  finalizeConfigurationSnapshot,
} from '@/lib/commerce/snapshot';
import { getPreviewTemplate } from '@/lib/commerce/templates';

function createMockItem(overrides?: {
  productId?: string;
  variantId?: number;
  width?: number;
  height?: number;
  mimeType?: string;
  hasTransparency?: boolean;
  productionAssetUrl?: string;
}) {
  const design = curatedDesigns[0];
  const products = getApprovedMerchProducts();
  const product = overrides?.productId
    ? products.find((p) => p.id === overrides.productId)!
    : products[1]; // everyday-tee

  const config = createProductConfiguration({
    designId: design.id,
    design: design.asset,
    product,
    template: getPreviewTemplate(product.previewTemplateId),
  });

  const snapshot = createCartSnapshot({
    id: '1f22af18-57b9-41f7-ab5e-a15bfb932728',
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
      printifyVariantId: overrides?.variantId ?? payload.configuration.printifyVariantId,
      designAssetWidth: overrides?.width ?? 4000,
      designAssetHeight: overrides?.height ?? 5000,
      designAssetMimeType: overrides?.mimeType ?? 'image/png',
      designAssetHasTransparency:
        overrides?.hasTransparency !== undefined
          ? overrides.hasTransparency
          : true,
      productionAssetUrl:
        overrides?.productionAssetUrl ??
        'https://assets.printme.ai/production/sample-design.png',
    },
  });
}

describe('Artwork Pre-flight Validator', () => {
  it('passes validation for compliant high-res apparel artwork with transparency', () => {
    const item = createMockItem({
      productId: 'everyday-tee',
      width: 4000,
      height: 5000,
      mimeType: 'image/png',
      hasTransparency: true,
    });

    const result = validateItemArtwork(item);
    expect(result.valid).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.transparencyRequired).toBe(true);
    expect(result.hasTransparency).toBe(true);
    expect(result.effectiveDpi).toBeGreaterThanOrEqual(150);
  });

  it('fails apparel artwork if transparency is missing (hasTransparency: false)', () => {
    const item = createMockItem({
      productId: 'everyday-tee',
      hasTransparency: false,
    });

    const result = validateItemArtwork(item);
    expect(result.valid).toBe(false);
    expect(result.failures.some((f) => f.includes('ARTWORK_MISSING_TRANSPARENCY'))).toBe(true);
  });

  it('does not require transparency for flat art posters', () => {
    const item = createMockItem({
      productId: 'gallery-poster',
      variantId: 43138,
      width: 3600,
      height: 5400,
      hasTransparency: false,
    });

    const result = validateItemArtwork(item);
    expect(result.transparencyRequired).toBe(false);
    expect(result.failures.some((f) => f.includes('ARTWORK_MISSING_TRANSPARENCY'))).toBe(false);
    expect(result.valid).toBe(true);
  });

  it('fails artwork if effective resolution is below the minimum 150 DPI', () => {
    // 12x18 poster needs at least 1800x2700 for 150 DPI
    const item = createMockItem({
      productId: 'gallery-poster',
      variantId: 43138,
      width: 800,
      height: 1200, // ~66 DPI
    });

    const result = validateItemArtwork(item);
    expect(result.valid).toBe(false);
    expect(result.failures.some((f) => f.includes('ARTWORK_RESOLUTION_TOO_LOW'))).toBe(true);
    expect(result.effectiveDpi).toBeLessThan(150);
  });

  it('fails if productionAssetUrl is missing or not HTTPS', () => {
    const item = createMockItem({
      productionAssetUrl: 'http://insecure.example.com/art.png',
    });

    const result = validateItemArtwork(item);
    expect(result.valid).toBe(false);
    expect(result.failures.some((f) => f.includes('UNSAFE_ARTWORK_URL'))).toBe(true);
  });

  it('audits multiple items in an order and aggregates failures', () => {
    const validItem = createMockItem({
      productId: 'everyday-tee',
      hasTransparency: true,
      width: 4000,
      height: 5000,
    });
    const lowResItem = createMockItem({
      productId: 'gallery-poster',
      variantId: 43138,
      width: 600,
      height: 900,
    });

    const audit = validateOrderArtwork([validItem, lowResItem]);
    expect(audit.valid).toBe(false);
    expect(audit.hasFailures).toBe(true);
    expect(audit.itemAudits[0].valid).toBe(true);
    expect(audit.itemAudits[1].valid).toBe(false);
  });
});
