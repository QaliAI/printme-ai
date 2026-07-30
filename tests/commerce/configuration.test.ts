import { describe, expect, it } from 'vitest';
import {
  createCartSnapshot,
  readLocalCart,
  writeLocalCart,
} from '@/lib/commerce/local-cart';
import {
  createProductConfiguration,
} from '@/lib/commerce/placement';
import { curatedDesigns, merchProducts } from '@/lib/commerce/fixtures';
import { getPreviewTemplate } from '@/lib/commerce/templates';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('product switching', () => {
  it('preserves valid normalized placement on a compatible product', () => {
    const design = curatedDesigns[0];
    const poster = merchProducts[0];
    const initial = createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product: poster,
      template: getPreviewTemplate(poster.previewTemplateId),
    });
    const moved = {
      ...initial,
      normalizedX: 0.63,
      normalizedY: 0.41,
      normalizedScale: 1.12,
      angle: 8,
    };
    const compatibleProduct = {
      ...poster,
      id: 'gallery-poster-compatible-fixture',
      name: 'Compatible poster fixture',
    };

    const switched = createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product: compatibleProduct,
      template: getPreviewTemplate(compatibleProduct.previewTemplateId),
      previous: moved,
    });

    expect(switched).toMatchObject({
      normalizedX: 0.63,
      normalizedY: 0.41,
      normalizedScale: 1.12,
      angle: 8,
      printPosition: 'front',
      decorationMethod: 'sublimation',
    });
  });

  it('applies the explicit curated default when placement is incompatible', () => {
    const design = curatedDesigns[0];
    const poster = merchProducts[0];
    const tee = merchProducts[1];
    const initial = createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product: poster,
      template: getPreviewTemplate(poster.previewTemplateId),
    });
    const moved = {
      ...initial,
      normalizedX: 0.7,
      normalizedY: 0.3,
      normalizedScale: 1.2,
    };

    const switched = createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product: tee,
      template: getPreviewTemplate(tee.previewTemplateId),
      previous: moved,
    });

    expect(switched).toMatchObject({
      merchProductId: tee.id,
      normalizedX: tee.defaultPlacement.normalizedX,
      normalizedY: tee.defaultPlacement.normalizedY,
      normalizedScale: tee.defaultPlacement.normalizedScale,
      decorationMethod: 'dtg',
    });
    expect(switched.instantPreview.renderKey).not.toBe(
      initial.instantPreview.renderKey
    );
  });
});

describe('configuration preservation', () => {
  it('round-trips the exact configuration through the isolated cart adapter', () => {
    const storage = new MemoryStorage();
    const design = curatedDesigns[0];
    const product = merchProducts[1];
    const configuration = createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    });
    const snapshot = createCartSnapshot({
      id: 'cart-fixture-1',
      configuration,
      design,
      product,
      createdAt: '2026-07-29T12:00:00.000Z',
    });

    writeLocalCart(storage, [snapshot]);
    const restored = readLocalCart(storage);

    expect(restored).toEqual([snapshot]);
    expect(restored[0].configuration).toEqual(configuration);
    expect(restored[0].configuration.instantPreview.renderKey).toBe(
      configuration.instantPreview.renderKey
    );
  });
});
