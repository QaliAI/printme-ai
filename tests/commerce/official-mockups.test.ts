import { describe, expect, it, vi } from 'vitest';
import {
  compareMockupPlacement,
  generateReconciledOfficialMockup,
  type OfficialMockupResult,
} from '@/lib/commerce/official-mockups';
import type { ProductConfiguration } from '@/lib/commerce/types';

const configuration: ProductConfiguration = {
  designId: 'design-1',
  designVersion: 'version-1',
  designAssetUrl: '/design.png',
  productionAssetUrl: '/design-print.png',
  merchProductId: 'everyday-tee',
  printifyBlueprintId: 12,
  printifyProviderId: 99,
  printifyVariantId: 18541,
  printPosition: 'front',
  decorationMethod: 'dtg',
  normalizedX: 0.5,
  normalizedY: 0.5,
  normalizedScale: 0.82,
  angle: 0,
  selectedColor: 'White',
  selectedSize: 'M',
  previewTemplateId: 'tee-m-v2',
  previewViewId: 'tee-m-front',
  instantPreview: {
    rendererId: 'instant-2d-v1',
    state: 'ready',
    viewId: 'tee-m-front',
    renderKey: 'instant-approved-composition',
  },
  unitPrice: 3400,
  currency: 'USD',
};

describe('official mockup reconciliation', () => {
  it('flags a materially different official placement', () => {
    expect(
      compareMockupPlacement(configuration, {
        normalizedX: 0.62,
        normalizedY: 0.5,
        normalizedScale: 0.7,
        angle: 0,
      }).materiallyDifferent,
    ).toBe(true);
  });

  it('caches an accepted mockup without replacing customer placement', async () => {
    const values = new Map<string, OfficialMockupResult>();
    const cache = {
      get: vi.fn(async (key: string) => values.get(key) ?? null),
      set: vi.fn(async (key: string, value: OfficialMockupResult) => {
        values.set(key, value);
      }),
    };
    const generator = {
      generate: vi.fn(async () => ({
        url: 'https://images.printify.com/official.png',
        observedPlacement: {
          normalizedX: 0.5,
          normalizedY: 0.5,
          normalizedScale: 0.82,
          angle: 0,
        },
        generatedAt: '2026-07-30T12:00:00.000Z',
      })),
    };

    const first = await generateReconciledOfficialMockup({
      configuration,
      cache,
      generator,
    });
    const second = await generateReconciledOfficialMockup({
      configuration,
      cache,
      generator,
    });

    expect(first.state).toBe('ready');
    expect(first.configuration.normalizedX).toBe(configuration.normalizedX);
    expect(first.configuration.officialMockupUrl).toContain('printify.com');
    expect(second.fromCache).toBe(true);
    expect(generator.generate).toHaveBeenCalledTimes(1);
  });
});
