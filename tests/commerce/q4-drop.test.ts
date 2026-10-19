import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { preferredGarmentColor, productsForDesign, variantsForDesign } from '@/lib/commerce/designs/garment-colors';
import { SeedDesignRepository } from '@/lib/commerce/designs/repository';

const slugs = [
  'made-by-machines',
  'second-helping-athletics',
  'supervising-the-decorations',
  'one-more-chapter-tour',
  'low-power-mode',
  'soup-of-the-day',
  'he-saw-the-group-chat',
];

describe('Q4 2026 drop', () => {
  it('publishes every design with print files sized to its recommended product', async () => {
    const repository = new SeedDesignRepository();
    const products = getApprovedMerchProducts();
    for (const slug of slugs) {
      const design = (await repository.findPublishedBySlug(slug))!;
      expect(design, slug).toBeTruthy();
      expect(design.filters).toEqual(['new']);
      const file = path.join(process.cwd(), 'public', design.asset.productionUrl!);
      const meta = await sharp(readFileSync(file)).metadata();
      expect([meta.width, meta.height]).toEqual([design.asset.width, design.asset.height]);
      const product = products.find((candidate) => candidate.id === design.recommendedProductId)!;
      expect(design.compatibleProductIds).toContain(product.id);
      if (product.kind === 'apparel') {
        const placeholder = product.variants.find((variant) => variant.color === design.defaultProductColor)!.placeholders.find((p) => p.position === 'front')!;
        // Designs are drawn at the large-size print area so they fill it exactly.
        expect(design.asset.width / design.asset.height).toBeCloseTo(placeholder.width / placeholder.height, 1);
      }
    }
  });

  it('never offers dark-ink artwork on light garments or light-ink artwork on dark ones', async () => {
    const repository = new SeedDesignRepository();
    const products = getApprovedMerchProducts();
    const dark = (await repository.findPublishedBySlug('one-more-chapter-tour'))!;
    const light = (await repository.findPublishedBySlug('supervising-the-decorations'))!;
    const tee = products.find((product) => product.id === 'everyday-tee')!;
    expect(variantsForDesign(tee, dark).every((variant) => ['Black', 'Heather Navy'].includes(variant.color!))).toBe(true);
    expect(variantsForDesign(tee, light).some((variant) => variant.color === 'Black')).toBe(false);
    expect(preferredGarmentColor(tee, dark)).toBe('Black');
    expect(preferredGarmentColor(products.find((product) => product.id === 'heavy-hoodie')!, dark)).toBe('Black');
    // Apparel without an allowed colour is not offered at all.
    expect(productsForDesign(products, { garmentColors: ['Heather Navy'] }).map((product) => product.id)).not.toContain('heavy-hoodie');
  });

  it('shows every design on an official Printify mockup with recorded provenance', () => {
    const provenance = JSON.parse(readFileSync(path.join(process.cwd(), 'public/merch/provenance.json'), 'utf8')) as Array<{ file: string; design: string; source: string }>;
    for (const slug of [...slugs, 'civilized-trash', 'carved-under-protest', 'professional-rummager']) {
      const entries = provenance.filter((entry) => entry.design === slug);
      expect(entries.length, slug).toBeGreaterThanOrEqual(1);
      for (const entry of entries) {
        expect(entry.source).toBe('Printify generated mockup');
        expect(existsSync(path.join(process.cwd(), 'public/merch', entry.file)), entry.file).toBe(true);
      }
    }
  });
});
