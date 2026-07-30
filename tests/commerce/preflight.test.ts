import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { runDesignPreflight } from '@/lib/commerce/preflight';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type { DesignAsset } from '@/lib/commerce/types';

const product = getApprovedMerchProducts().find(
  (candidate) => candidate.id === 'gallery-poster',
)!;
const variant = product.variants[0];
const asset: DesignAsset = {
  id: 'asset-preflight',
  version: 'version-1',
  url: '/fixture.png',
  alt: 'Fixture',
  width: 3600,
  height: 5400,
  mimeType: 'image/png',
  hasTransparency: true,
};

function configurationFor(design = asset) {
  return createProductConfiguration({
    designId: 'design-preflight',
    design,
    product,
    template: getPreviewTemplate(product.previewTemplateId),
  });
}

describe('design preflight', () => {
  it('reports a high-resolution centered image as good to print', () => {
    const configuration = configurationFor();
    const report = runDesignPreflight({
      asset,
      configuration,
      product,
      variant,
    });
    expect(report.primary.message).toBe('Good to print');
    expect(report.effectiveDpi).toBe(300);
    expect(report.canAddToCart).toBe(true);
  });

  it('detects low effective DPI and potential cover cropping', () => {
    const small = { ...asset, width: 500, height: 500 };
    const configuration = {
      ...configurationFor(small),
      fit: 'cover' as const,
    };
    const report = runDesignPreflight({
      asset: small,
      configuration,
      product,
      variant,
    });
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        'may-appear-soft',
        'very-small-artwork',
        'potential-cropping',
      ]),
    );
  });

  it('blocks unsafe placement and unsupported files', () => {
    const unsupported = { ...asset, mimeType: 'image/tiff' };
    const configuration = {
      ...configurationFor(unsupported),
      normalizedX: 0.05,
    };
    const report = runDesignPreflight({
      asset: unsupported,
      configuration,
      product,
      variant,
    });
    expect(report.canAddToCart).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(['unsupported-file-type', 'outside-safe-area']),
    );
  });
});
