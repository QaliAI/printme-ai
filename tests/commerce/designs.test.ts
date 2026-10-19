import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
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
    // boo-crew is published and filtered 'new' + 'trending' (editorial staff pick).
    const published = developmentDesignSeeds.find((design) => design.slug === 'boo-crew')!;
    const draft = {
      ...published,
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
    const design = await repository.findPublishedBySlug('civilized-trash');
    const collection = await repository.findCollectionBySlug('specimen-plates');

    expect(design?.title).toBe('Civilized Trash');
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

    await expect(service.listPublished()).resolves.toHaveLength(26);
  });

  it('provides Shop V2 with server-repository designs and valid products', async () => {
    const service = new DesignCatalogService(new SeedDesignRepository());
    const designs = await service.listPublished();
    const products = getApprovedMerchProducts();

    expect(designs).toHaveLength(26);
    for (const design of designs) {
      expect(() => getRecommendedProduct(design, products)).not.toThrow();
      expect(design.asset.productionUrl).toBeTruthy();
    }
  });

  it('correctly resolves Fall 2026 collections and anchor products', async () => {
    const repository = new SeedDesignRepository();
    const [halloween, fall, thanksgiving] = await Promise.all([
      repository.findCollectionBySlug('halloween'),
      repository.findCollectionBySlug('fall'),
      repository.findCollectionBySlug('thanksgiving'),
    ]);

    expect(halloween?.designIds).toEqual([
      'design-carved-under-protest',
      'design-boo-crew',
      'design-here-for-the-boos',
      'design-little-pumpkin',
      'design-haunted-household',
      'design-library-of-lost-hours',
      'design-midnight-hayride',
    ]);
    expect(fall?.designIds).toEqual([
      'design-autumn-state-of-mind',
      'design-powered-by-pumpkin-spice',
      'design-sweater-weather',
      'design-night-garden-society',
      'design-field-notes-after-dark',
    ]);
    expect(thanksgiving?.designIds).toEqual([
      'design-second-helping-athletics',
      'design-feast-mode',
      'design-thankful-grateful-caffeinated',
      'design-thanksgiving-social-club',
      'design-leftovers-league',
    ]);

    const booCrew = await repository.findPublishedBySlug('boo-crew');
    expect(booCrew?.recommendedProductId).toBe('everyday-tee');
    expect(booCrew?.compatibleProductIds).toContain('keepsake-mug');
    expect(booCrew?.compatibleProductIds).toContain('gallery-poster');

    const pps = await repository.findPublishedBySlug('powered-by-pumpkin-spice');
    expect(pps?.recommendedProductId).toBe('keepsake-mug');

    const poster = await repository.findPublishedBySlug('autumn-state-of-mind');
    expect(poster?.recommendedProductId).toBe('gallery-poster');
  });
});

describe('development seeds', () => {
  it('keeps demo-photo seeds and their collections out of the storefront', async () => {
    const repository = new SeedDesignRepository();
    await expect(repository.findPublishedBySlug('sunday-sidekick')).resolves.toBeNull();
    await expect(repository.findCollectionBySlug('pets')).resolves.toBeNull();
    const published = await repository.listPublished();
    expect(published.every((design) => design.rightsStatus === 'commercial-print-cleared')).toBe(true);
  });
});

describe('Specimen Plates originals', () => {
  const slugs = ['civilized-trash', 'carved-under-protest', 'professional-rummager'];

  it('publishes the collection without sales or trend claims', async () => {
    const repository = new SeedDesignRepository();
    const collection = await repository.findCollectionBySlug('specimen-plates');
    expect(collection?.designIds).toHaveLength(3);
    for (const slug of slugs) {
      const design = await repository.findPublishedBySlug(slug);
      expect(design?.artistOrSource).toBe('PrintMe Studio Originals');
      expect(design?.filters).toEqual(['new']);
      expect(design?.compatibleProductIds).toEqual(['everyday-tee', 'gallery-poster']);
    }
  });

  it('ships transparent print files at the tee print-area size', async () => {
    for (const slug of slugs) {
      const file = path.join(process.cwd(), 'public', 'designs', 'originals', `${slug}.png`);
      const meta = await sharp(readFileSync(file)).metadata();
      expect([meta.width, meta.height, meta.hasAlpha]).toEqual([3951, 4800, true]);
    }
  });
});
