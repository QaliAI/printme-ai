import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { previewTemplates, verifiedBlankProductImages } from '@/lib/commerce/templates';
import { validateProductTemplates } from '@/lib/commerce/template-validation';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
describe('verified blank preview architecture', () => {
  it('uses only reviewed blank bases whose pixels match the provenance record', () => {
    const manifest = JSON.parse(fs.readFileSync('public/shop-v2/blank-product-provenance.json', 'utf8'));
    for (const template of previewTemplates) for (const view of template.views) {
      expect(verifiedBlankProductImages.has(view.baseProductImage)).toBe(true);
      const asset = manifest.assets.find((entry: {
        path: string;
      }) => entry.path === view.baseProductImage);
      expect(asset, view.baseProductImage).toBeDefined();
      const bytes = fs.readFileSync(path.join('public', view.baseProductImage));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
    }
  });
  it('rejects a preprinted sample even if its path exists', () => {
    const badTemplates = structuredClone(previewTemplates);
    for (const template of badTemplates) for (const view of template.views) view.baseProductImage = '/landing/mockups/product-mug.webp';
    expect(validateProductTemplates(getApprovedMerchProducts(), badTemplates).some(issue => issue.code === 'missing-mockup')).toBe(true);
  });
  it('retires baked product samples while retaining seasonal source artwork', () => {
    expect(fs.existsSync('public/landing/mockups') ? fs.readdirSync('public/landing/mockups') : []).toEqual([]);
    expect(fs.existsSync('public/designs/seasonal-edit/mockups') ? fs.readdirSync('public/designs/seasonal-edit/mockups') : []).toEqual([]);
    expect(fs.existsSync('public/designs/seasonal-edit/haunted-household.png')).toBe(true);
    const generator = fs.readFileSync('scripts/generate-seasonal-edit-assets.mjs', 'utf8');
    expect(generator).not.toMatch(/baseMockup|mockupPlacement|blend:|landing\/mockups/);
  });
});
