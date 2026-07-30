import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { validateProductTemplates } from '@/lib/commerce/template-validation';
import { previewTemplates } from '@/lib/commerce/templates';

describe('approved product template validation command', () => {
  it('validates every approved variant, position, and decoration mapping', () => {
    expect(
      validateProductTemplates(getApprovedMerchProducts(), previewTemplates),
    ).toEqual([]);
  });

  it('detects mapping, dimension, safe-zone, and aspect defects', () => {
    const products = getApprovedMerchProducts();
    const templates = structuredClone(previewTemplates);
    const template = templates.find(
      (candidate) => candidate.id === 'poster-12x18-v2',
    )!;
    template.views[0].placeholderWidth = 100;
    template.views[0].safeZoneInset = 0;
    template.views[0].printArea.width = 100;

    const codes = validateProductTemplates(products, templates).map(
      (item) => item.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        'placeholder-dimension-mismatch',
        'missing-safe-zone',
        'incorrect-aspect-ratio',
      ]),
    );
  });
});
