import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import {
  assertDesignProductCompatible,
  getRecommendedProduct,
} from '@/lib/commerce/designs/rules';
import {
  filterPublishedDesigns,
  SeedDesignRepository,
  type DesignRepository,
} from '@/lib/commerce/designs/repository';
import { DesignCatalogService } from '@/lib/commerce/designs/service';
import {
  developmentDesignSeeds,
} from '@/lib/commerce/designs/seed';

describe('curated design catalog', () => {
  it('filters to published designs and excludes drafts', () => {
    const published = developmentDesignSeeds[0];
    const draft = {
      ...developmentDesignSeeds[1],
      id: 'draft-design',
      slug: 'draft-design',
      publicationStatus: 'draft' as const,
    };

    expect(filterPublishedDesigns([draft, published])).toEqual([published]);
    expect(filterPublishedDesigns([published], 'trending')).toEqual([
      published,
    ]);
    expect(filterPublishedDesigns([published], 'bestsellers')).toEqual([]);
  });

  it('resolves published slugs and collection membership', async () => {
    const repository = new SeedDesignRepository();
    const design = await repository.findPublishedBySlug('sunday-sidekick');
    const collection = await repository.findCollectionBySlug('pets');

    expect(design?.title).toBe('Sunday Sidekick');
    expect(collection?.designIds).toContain(design?.id);
    await expect(
      repository.findPublishedBySlug('missing-design'),
    ).resolves.toBeNull();
  });

  it('selects only a compatible recommended product', () => {
    const products = getApprovedMerchProducts();
    const design = developmentDesignSeeds[0];

    expect(getRecommendedProduct(design, products).id).toBe(
      design.recommendedProductId,
    );

    expect(() =>
      assertDesignProductCompatible(
        {
          ...design,
          compatibleProductIds: ['gallery-poster'],
          incompatibleProductIds: ['everyday-tee'],
        },
        'everyday-tee',
      ),
    ).toThrow(/not compatible/i);
  });

  it('uses seed data only as an explicit development fallback', async () => {
    const failing = new Proxy({} as DesignRepository, {
      get() {
        return async () => {
          throw new Error('Database unavailable');
        };
      },
    });
    const service = new DesignCatalogService(
      failing,
      new SeedDesignRepository(),
    );

    await expect(service.listPublished()).resolves.toHaveLength(5);
  });

  it('provides Shop V2 with server-repository designs and valid products', async () => {
    const service = new DesignCatalogService(new SeedDesignRepository());
    const designs = await service.listPublished();
    const products = getApprovedMerchProducts();

    expect(designs).toHaveLength(5);
    for (const design of designs) {
      expect(() => getRecommendedProduct(design, products)).not.toThrow();
      expect(design.asset.productionUrl).toBeTruthy();
    }
  });
});
