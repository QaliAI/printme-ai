import { describe, expect, it } from 'vitest';
import {
  adaptCuratedDesign,
  adaptLegacyGeneratedDesign,
  asRenderableDesignAsset,
  assertVersionCanBeSuperseded,
} from '@/lib/commerce/designs/canonical';
import { curatedDesigns, merchProducts } from '@/lib/commerce/fixtures';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import { productConfigurationSchema } from '@/lib/commerce/snapshot';

describe('canonical design adapters', () => {
  it('preserves the source separately from generated and preview assets', () => {
    const aggregate = adaptLegacyGeneratedDesign({
      id: 'legacy-1',
      user_id: 'user-1',
      original_image_url: 'https://assets.example/original.png',
      generated_image_url: 'https://assets.example/styled.png',
      thumbnail_url: 'https://assets.example/thumb.png',
      status: 'completed',
      style_preset_id: 'watercolor',
      created_at: '2026-07-30T12:00:00.000Z',
      updated_at: '2026-07-30T12:10:00.000Z',
      source_width: 2400,
      source_height: 3000,
      source_mime_type: 'image/png',
    });

    expect(aggregate.design).toMatchObject({
      kind: 'customer',
      sourceType: 'ai-styled',
      legacyGeneratedDesignId: 'legacy-1',
    });
    expect(aggregate.assets.map((asset) => asset.role)).toEqual([
      'original',
      'production',
      'preview',
    ]);
    expect(aggregate.versions[0]).toMatchObject({
      reason: 'legacy-generated-design-imported',
      revision: 1,
    });
  });

  it('requires real image dimensions before a legacy design can render', () => {
    const aggregate = adaptLegacyGeneratedDesign({
      id: 'legacy-no-dimensions',
      user_id: 'user-1',
      original_image_url: 'https://assets.example/original.png',
      status: 'completed',
      created_at: '2026-07-30T12:00:00.000Z',
      updated_at: '2026-07-30T12:10:00.000Z',
    });

    expect(() => asRenderableDesignAsset({ aggregate })).toThrow(
      'Image dimensions are required',
    );
  });

  it('feeds curated and uploaded designs through the same configuration schema', () => {
    const aggregate = adaptCuratedDesign(curatedDesigns[0]);
    const asset = asRenderableDesignAsset({ aggregate });
    const product = merchProducts[0];
    const configuration = createProductConfiguration({
      designId: aggregate.design.id,
      design: asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    });

    expect(productConfigurationSchema.parse(configuration)).toMatchObject({
      designId: aggregate.design.id,
      designVersionId: aggregate.design.currentVersionId,
      designSourceType: 'curated',
      designAssetId: asset.id,
      productionAssetId: asset.productionAssetId,
    });
  });

  it('does not permit a published or purchased version to be mutated', () => {
    const aggregate = adaptCuratedDesign(curatedDesigns[0]);
    expect(() =>
      assertVersionCanBeSuperseded(aggregate.versions[0], 'published'),
    ).toThrow('immutable');
  });
});
