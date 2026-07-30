import { describe, expect, it } from 'vitest';
import { curatedDesigns, merchProducts } from '@/lib/commerce/fixtures';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import {
  cartConfigurationSnapshotSchema,
  copyImmutableOrderSnapshot,
  createConfigurationHash,
} from '@/lib/commerce/snapshot';
import { getPreviewTemplate } from '@/lib/commerce/templates';

function createFixtureSnapshot() {
  const design = curatedDesigns[0];
  const product = merchProducts[1];
  const configuration = createProductConfiguration({
    designId: design.id,
    design: design.asset,
    product,
    template: getPreviewTemplate(product.previewTemplateId),
  });
  return createCartSnapshot({
    id: '56ee753d-27cc-4374-bc9c-5d9bb27a245a',
    configuration,
    design,
    product,
    createdAt: '2026-07-29T12:00:00.000Z',
  });
}

describe('immutable configuration snapshots', () => {
  it('serializes and validates every purchase-time field', () => {
    const snapshot = createFixtureSnapshot();
    const restored = cartConfigurationSnapshotSchema.parse(
      JSON.parse(JSON.stringify(snapshot)) as unknown
    );

    expect(restored).toEqual(snapshot);
    expect(restored).toMatchObject({
      schemaVersion: 2,
      designTitle: 'Sunday Sidekick',
      productTitle: 'Everyday Tee',
      variantTitle: 'White / M',
      productCost: null,
      createdAt: '2026-07-29T12:00:00.000Z',
    });
    expect(restored.configuration).toMatchObject({
      designId: 'design-pet-pop',
      designVersion: 'fixture-v1',
      designAssetUrl: '/landing/transformations/pet-cartoon.webp',
      productionAssetUrl: '/landing/transformations/pet-cartoon.webp',
      printifyBlueprintId: 12,
      printifyProviderId: 39,
      printifyVariantId: 9576,
      printPosition: 'front',
      decorationMethod: 'dtg',
      normalizedX: 0.5,
      normalizedY: 0.5,
      normalizedScale: 0.82,
      angle: 0,
      selectedColor: 'White',
      selectedSize: 'M',
      previewTemplateId: 'tee-studio-v1',
      previewViewId: 'tee-front',
      unitPrice: 3400,
      currency: 'USD',
    });
  });

  it('produces a stable hash independent of object key order and cart metadata', () => {
    const snapshot = createFixtureSnapshot();
    const reordered = {
      productCost: snapshot.productCost,
      variantTitle: snapshot.variantTitle,
      productTitle: snapshot.productTitle,
      designTitle: snapshot.designTitle,
      configuration: snapshot.configuration,
      schemaVersion: snapshot.schemaVersion,
    };

    expect(createConfigurationHash(reordered)).toBe(
      snapshot.configurationHash
    );
    expect(
      createConfigurationHash({
        ...reordered,
        configuration: {
          ...snapshot.configuration,
          unitPrice: snapshot.configuration.unitPrice + 1,
        },
      })
    ).not.toBe(snapshot.configurationHash);
  });

  it('rejects a snapshot whose approved data was changed without rehashing', () => {
    const snapshot = createFixtureSnapshot();
    expect(() =>
      cartConfigurationSnapshotSchema.parse({
        ...snapshot,
        productTitle: 'Tampered title',
      })
    ).toThrow(/hash/i);
  });

  it('copies order snapshots without retaining mutable cart references', () => {
    const snapshot = createFixtureSnapshot();
    const orderSnapshot = copyImmutableOrderSnapshot(snapshot);

    snapshot.configuration.selectedSize = 'L';
    snapshot.quantity = 4;

    expect(orderSnapshot.configuration.selectedSize).toBe('M');
    expect(orderSnapshot.quantity).toBe(1);
    expect(cartConfigurationSnapshotSchema.parse(orderSnapshot)).toEqual(
      orderSnapshot
    );
  });
});
