import { z } from 'zod';
import type {
  CuratedDesign,
  DesignAsset,
  DesignAssetRole,
  DesignSourceType,
  PrintPlacement,
  ProductConfiguration,
} from '../types';

export const designSourceTypeSchema = z.enum([
  'uploaded-photo',
  'uploaded-artwork',
  'ai-generated',
  'ai-styled',
  'background-removed',
  'curated',
  'text-personalized',
]);

export const designAssetRoleSchema = z.enum([
  'original',
  'preview',
  'display',
  'production',
  'product-derivative',
]);

export const designVersionReasonSchema = z.enum([
  'initial',
  'background-removed',
  'style-changed',
  'artwork-cropped',
  'product-derivative-generated',
  'text-personalization-changed',
  'legacy-generated-design-imported',
  'curated-design-imported',
]);

export type DesignVersionReason = z.infer<typeof designVersionReasonSchema>;
export type DesignLifecycleStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'purchased'
  | 'archived';

export interface DesignAssetRecord {
  id: string;
  designId: string;
  versionId: string | null;
  sourceType: DesignSourceType;
  role: DesignAssetRole;
  parentAssetId: string | null;
  derivativeId: string | null;
  url: string;
  storagePath: string | null;
  checksum: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  fileSizeBytes: number | null;
  hasTransparency: boolean;
  createdAt: string;
}

export interface DesignVersion {
  id: string;
  designId: string;
  revision: number;
  sourceType: DesignSourceType;
  reason: DesignVersionReason;
  originalAssetId: string;
  previewAssetId: string;
  displayAssetId: string;
  productionAssetId: string;
  supersedesVersionId: string | null;
  createdBy: string | null;
  createdAt: string;
  lockedAt: string | null;
}

interface CanonicalDesignBase {
  id: string;
  sourceType: DesignSourceType;
  ownerUserId: string | null;
  title: string;
  currentVersionId: string;
  status: DesignLifecycleStatus;
  legacyGeneratedDesignId: string | null;
  curatedDesignId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDesign extends CanonicalDesignBase {
  kind: 'customer';
  ownerUserId: string;
  legacyGeneratedDesignId: string | null;
  curatedDesignId: null;
}

export interface CanonicalCuratedDesign extends CanonicalDesignBase {
  kind: 'curated';
  sourceType: 'curated';
  ownerUserId: null;
  legacyGeneratedDesignId: null;
  curatedDesignId: string;
}

export type CommerceDesign = CustomerDesign | CanonicalCuratedDesign;

export interface DesignDerivative {
  id: string;
  designId: string;
  designVersionId: string;
  sourceAssetId: string;
  outputAssetId: string;
  merchProductId: string;
  variantId: string | null;
  adaptationKind: string;
  parameters: Record<string, unknown>;
  automated: boolean;
  createdAt: string;
}

export interface DesignProductAdaptation {
  id: string;
  designVersionId: string;
  merchProductId: string;
  variantId: string | null;
  derivativeId: string | null;
  defaultPlacement: PrintPlacement;
  status: 'not-required' | 'ready' | 'needs-review' | 'failed';
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PreviewResult {
  id: string;
  configurationHash: string;
  renderer: 'instant' | 'printify';
  status: 'pending' | 'ready' | 'failed' | 'needs-review';
  previewUrl: string | null;
  designVersionId: string;
  productionAssetId: string;
  merchProductId: string;
  printifyVariantId: number;
  viewId: string;
  differenceScore: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ProductionAsset extends DesignAssetRecord {
  role: 'production';
  printReady: boolean;
  effectiveDpi: number | null;
  validationWarnings: string[];
}

export interface ProductConfigurationSnapshotRecord {
  id: string;
  designId: string;
  designVersionId: string;
  productionAssetId: string;
  configuration: ProductConfiguration;
  configurationHash: string;
  schemaVersion: number;
  lockedReason: 'cart' | 'checkout' | 'purchase' | 'fulfillment';
  createdAt: string;
}

export interface LegacyGeneratedDesignRow {
  id: string;
  user_id: string;
  original_image_url: string;
  generated_image_url?: string | null;
  thumbnail_url?: string | null;
  status: string;
  style_preset_id?: string | null;
  created_at: string;
  updated_at: string;
  source_width?: number | null;
  source_height?: number | null;
  source_mime_type?: string | null;
}

export interface CanonicalDesignAggregate {
  design: CommerceDesign;
  versions: DesignVersion[];
  assets: DesignAssetRecord[];
}

function canonicalId(prefix: string, id: string) {
  return `${prefix}-${id}`;
}

function toLegacyAsset(input: {
  id: string;
  designId: string;
  versionId: string;
  sourceType: DesignSourceType;
  role: DesignAssetRole;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  createdAt: string;
  parentAssetId?: string | null;
}): DesignAssetRecord {
  return {
    id: input.id,
    designId: input.designId,
    versionId: input.versionId,
    sourceType: input.sourceType,
    role: input.role,
    parentAssetId: input.parentAssetId ?? null,
    derivativeId: null,
    url: input.url,
    storagePath: null,
    checksum: null,
    alt: input.alt,
    width: input.width,
    height: input.height,
    mimeType: input.mimeType,
    fileSizeBytes: null,
    hasTransparency: false,
    createdAt: input.createdAt,
  };
}

export function adaptLegacyGeneratedDesign(
  row: LegacyGeneratedDesignRow,
): CanonicalDesignAggregate {
  const designId = canonicalId('customer-design', row.id);
  const versionId = canonicalId('design-version', row.id);
  const originalAssetId = canonicalId('original-asset', row.id);
  const transformedUrl = row.generated_image_url ?? row.original_image_url;
  const transformedAssetId = row.generated_image_url
    ? canonicalId('generated-asset', row.id)
    : originalAssetId;
  const thumbnailAssetId = row.thumbnail_url
    ? canonicalId('thumbnail-asset', row.id)
    : transformedAssetId;
  const mimeType = row.source_mime_type ?? 'image/unknown';
  const original = toLegacyAsset({
    id: originalAssetId,
    designId,
    versionId,
    sourceType: 'uploaded-photo',
    role: 'original',
    url: row.original_image_url,
    alt: 'Original customer upload',
    width: row.source_width ?? null,
    height: row.source_height ?? null,
    mimeType,
    createdAt: row.created_at,
  });
  const assets: DesignAssetRecord[] = [original];

  if (transformedAssetId !== originalAssetId) {
    assets.push(
      toLegacyAsset({
        id: transformedAssetId,
        designId,
        versionId,
        sourceType: row.style_preset_id ? 'ai-styled' : 'ai-generated',
        role: 'production',
        url: transformedUrl,
        alt: 'Prepared customer artwork',
        width: row.source_width ?? null,
        height: row.source_height ?? null,
        mimeType,
        createdAt: row.created_at,
        parentAssetId: originalAssetId,
      }),
    );
  }

  if (
    row.thumbnail_url &&
    thumbnailAssetId !== originalAssetId &&
    thumbnailAssetId !== transformedAssetId
  ) {
    assets.push(
      toLegacyAsset({
        id: thumbnailAssetId,
        designId,
        versionId,
        sourceType: row.style_preset_id ? 'ai-styled' : 'ai-generated',
        role: 'preview',
        url: row.thumbnail_url,
        alt: 'Customer artwork thumbnail',
        width: row.source_width ?? null,
        height: row.source_height ?? null,
        mimeType,
        createdAt: row.created_at,
        parentAssetId: transformedAssetId,
      }),
    );
  }

  const displayAssetId =
    row.thumbnail_url && assets.some((asset) => asset.id === thumbnailAssetId)
      ? thumbnailAssetId
      : transformedAssetId;

  return {
    design: {
      id: designId,
      kind: 'customer',
      sourceType: row.generated_image_url
        ? row.style_preset_id
          ? 'ai-styled'
          : 'ai-generated'
        : 'uploaded-photo',
      ownerUserId: row.user_id,
      title: 'Imported customer design',
      currentVersionId: versionId,
      status: 'draft',
      legacyGeneratedDesignId: row.id,
      curatedDesignId: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    versions: [
      {
        id: versionId,
        designId,
        revision: 1,
        sourceType: row.generated_image_url
          ? row.style_preset_id
            ? 'ai-styled'
            : 'ai-generated'
          : 'uploaded-photo',
        reason: 'legacy-generated-design-imported',
        originalAssetId,
        previewAssetId: displayAssetId,
        displayAssetId,
        productionAssetId: transformedAssetId,
        supersedesVersionId: null,
        createdBy: row.user_id,
        createdAt: row.created_at,
        lockedAt: null,
      },
    ],
    assets,
  };
}

export function adaptCuratedDesign(
  design: CuratedDesign,
  publicationStatus: DesignLifecycleStatus = 'published',
): CanonicalDesignAggregate {
  const designId = canonicalId('curated-design', design.id);
  const versionId = canonicalId(
    'curated-version',
    `${design.id}-${design.asset.version}`,
  );
  const originalAssetId = canonicalId('curated-original', design.asset.id);
  const productionAssetId = design.asset.productionAssetId
    ? design.asset.productionAssetId
    : canonicalId('curated-production', design.asset.id);
  const createdAt = '1970-01-01T00:00:00.000Z';
  const original: DesignAssetRecord = {
    id: originalAssetId,
    designId,
    versionId,
    sourceType: 'curated',
    role: 'original',
    parentAssetId: null,
    derivativeId: null,
    url: design.asset.url,
    storagePath: null,
    checksum: null,
    alt: design.asset.alt,
    width: design.asset.width,
    height: design.asset.height,
    mimeType: design.asset.mimeType,
    fileSizeBytes: null,
    hasTransparency: design.asset.hasTransparency,
    createdAt,
  };
  const production: DesignAssetRecord = {
    ...original,
    id: productionAssetId,
    role: 'production',
    parentAssetId: originalAssetId,
    url: design.asset.productionUrl ?? design.asset.url,
  };

  return {
    design: {
      id: designId,
      kind: 'curated',
      sourceType: 'curated',
      ownerUserId: null,
      title: design.title,
      currentVersionId: versionId,
      status: publicationStatus,
      legacyGeneratedDesignId: null,
      curatedDesignId: design.id,
      createdAt,
      updatedAt: createdAt,
    },
    versions: [
      {
        id: versionId,
        designId,
        revision: 1,
        sourceType: 'curated',
        reason: 'curated-design-imported',
        originalAssetId,
        previewAssetId: originalAssetId,
        displayAssetId: originalAssetId,
        productionAssetId,
        supersedesVersionId: null,
        createdBy: null,
        createdAt,
        lockedAt:
          publicationStatus === 'published' || publicationStatus === 'purchased'
            ? createdAt
            : null,
      },
    ],
    assets:
      productionAssetId === originalAssetId ? [original] : [original, production],
  };
}

export function asRenderableDesignAsset(input: {
  aggregate: CanonicalDesignAggregate;
  versionId?: string;
}): DesignAsset {
  const version = input.aggregate.versions.find(
    (candidate) =>
      candidate.id ===
      (input.versionId ?? input.aggregate.design.currentVersionId),
  );
  if (!version) {
    throw new Error('The requested design version does not exist.');
  }
  const display = input.aggregate.assets.find(
    (asset) => asset.id === version.displayAssetId,
  );
  const production = input.aggregate.assets.find(
    (asset) => asset.id === version.productionAssetId,
  );
  if (!display || !production) {
    throw new Error('The design version is missing required assets.');
  }
  if (!display.width || !display.height) {
    throw new Error(
      'Image dimensions are required before this legacy design can be previewed.',
    );
  }

  return {
    id: display.id,
    version: version.id,
    url: display.url,
    productionUrl: production.url,
    alt: display.alt,
    width: display.width,
    height: display.height,
    mimeType: display.mimeType,
    hasTransparency: display.hasTransparency,
    sourceType: version.sourceType,
    role: display.role,
    productionAssetId: production.id,
  };
}

export function assertVersionCanBeSuperseded(
  version: DesignVersion,
  designStatus: DesignLifecycleStatus,
) {
  if (
    version.lockedAt ||
    designStatus === 'published' ||
    designStatus === 'purchased'
  ) {
    throw new Error(
      'Published or purchased design versions are immutable. Create a new version.',
    );
  }
}
