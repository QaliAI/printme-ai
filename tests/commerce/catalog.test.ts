import { describe, expect, it, vi } from 'vitest';
import {
  CatalogCache,
  CatalogRateLimitError,
  CatalogRequestGate,
  CuratedCatalogService,
  type PrintifyCatalogSource,
} from '@/lib/commerce/catalog/catalog-service';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { validateSnapshotAgainstApprovedCatalog } from '@/lib/commerce/catalog/validation';
import { curatedDesigns } from '@/lib/commerce/fixtures';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import { printifyCatalogVariantSchema } from '@/lib/printify/client';

class FakeCatalogSource implements PrintifyCatalogSource {
  getBlueprint = vi.fn(async (blueprintId: number) => ({
    id: blueprintId,
    title: `Blueprint ${blueprintId}`,
    description: '',
    brand: '',
    model: '',
    images: [],
  }));

  listPrintProviders = vi.fn(async () => [
    {
      id: 99,
      title: 'Printify Choice',
      decoration_methods: ['dtg', 'digital-printing', 'sublimation'],
    },
  ]);

  getProviderVariants = vi.fn(
    async (
      blueprintId: number,
      _providerId: number,
      includeOutOfStock = false
    ) => {
      const approvedIds =
        blueprintId === 12
          ? [18541, 18542]
          : blueprintId === 68
            ? [721]
            : [43138, 43144];
      const ids = includeOutOfStock
        ? [...approvedIds, blueprintId * 100_000]
        : approvedIds;
      return {
        id: blueprintId,
        title: `Variants ${blueprintId}`,
        variants: ids.map((id) => ({
          id,
          title: `Variant ${id}`,
          options: {},
          placeholders: [
            {
              position: 'front',
              decoration_method:
                blueprintId === 12
                  ? 'dtg'
                  : blueprintId === 68
                    ? 'sublimation'
                    : 'digital-printing',
              width: 1000,
              height: 1000,
            },
          ],
        })),
      };
    }
  );

  getShippingInformation = vi.fn(async () => ({
    handling_time: { value: 10, unit: 'day' },
    profiles: [
      {
        variant_ids: [18541],
        first_item: { cost: 499, currency: 'USD' },
        additional_items: { cost: 199, currency: 'USD' },
        countries: ['US'],
      },
    ],
  }));
}

function approvedSnapshot() {
  const design = curatedDesigns[0];
  const product = getApprovedMerchProducts()[1];
  return createCartSnapshot({
    id: '6a571d0d-003a-4d61-bd98-6b27d62a7990',
    design,
    product,
    configuration: createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    }),
    createdAt: '2026-07-29T12:00:00.000Z',
  });
}

describe('validated curated catalog', () => {
  it('validates documented catalog responses and relationships', async () => {
    expect(
      printifyCatalogVariantSchema.safeParse({
        id: 18541,
        title: 'White / M',
        options: { color: 'White', size: 'M' },
        placeholders: [
          {
            position: 'front',
            decoration_method: 'dtg',
            width: 3591,
            height: 4364,
          },
        ],
      }).success
    ).toBe(true);
    expect(
      printifyCatalogVariantSchema.safeParse({
        id: 'not-a-number',
        title: 'Invalid',
      }).success
    ).toBe(false);

    await expect(
      validateSnapshotAgainstApprovedCatalog(approvedSnapshot())
    ).resolves.toBeUndefined();
  });

  it('rejects browser price tampering and unapproved products', async () => {
    const snapshot = approvedSnapshot();
    await expect(
      validateSnapshotAgainstApprovedCatalog({
        ...snapshot,
        configuration: {
          ...snapshot.configuration,
          unitPrice: snapshot.configuration.unitPrice - 1000,
        },
      })
    ).rejects.toMatchObject({ code: 'PRICE_MISMATCH' });

    await expect(
      validateSnapshotAgainstApprovedCatalog({
        ...snapshot,
        configuration: {
          ...snapshot.configuration,
          merchProductId: 'entire-upstream-catalog-is-not-approved',
        },
      })
    ).rejects.toMatchObject({ code: 'PRODUCT_NOT_APPROVED' });
  });

  it('rejects a stale or unavailable live variant', async () => {
    await expect(
      validateSnapshotAgainstApprovedCatalog(approvedSnapshot(), {
        isVariantAvailable: async () => false,
      })
    ).rejects.toMatchObject({ code: 'VARIANT_STALE' });
  });

  it('coalesces and caches catalog reads until expiry', async () => {
    let now = 1_000;
    const cache = new CatalogCache(100, () => now);
    const load = vi.fn(async () => ({ value: 1 }));

    const [first, second] = await Promise.all([
      cache.get('variants', load),
      cache.get('variants', load),
    ]);
    expect(first).toEqual(second);
    expect(load).toHaveBeenCalledTimes(1);

    now = 1_101;
    await cache.get('variants', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('enforces a catalog request budget below Printify limits', () => {
    let now = 0;
    const gate = new CatalogRequestGate(2, 1_000, () => now);
    gate.acquire();
    gate.acquire();
    expect(() => gate.acquire()).toThrow(CatalogRateLimitError);

    now = 1_001;
    expect(() => gate.acquire()).not.toThrow();
  });

  it('produces a dry-run without changing retail prices', async () => {
    const source = new FakeCatalogSource();
    const service = new CuratedCatalogService(
      source,
      new CatalogCache(),
      new CatalogRequestGate(),
      () => new Date('2026-07-29T12:00:00.000Z')
    );

    const report = await service.dryRunSync();

    expect(report.productsChecked).toBe(3);
    expect(report.newVariants).toHaveLength(3);
    expect(report.removedVariants).toEqual([]);
    expect(report.changedAvailability).toEqual([]);
    expect(report.retailPricesChanged).toBe(false);
    expect(source.getShippingInformation).toHaveBeenCalledTimes(3);
  });
});
