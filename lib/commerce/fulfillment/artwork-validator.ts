import 'server-only';

import { getApprovedMerchProduct } from '../catalog/approved-catalog';
import type { CartConfigurationSnapshot } from '../types';

export interface ArtworkValidationResult {
  valid: boolean;
  itemExternalId: string;
  designTitle: string;
  productTitle: string;
  variantTitle: string;
  productionAssetUrl: string;
  mimeType?: string;
  dimensions?: { width: number; height: number };
  requiredDimensions?: { width: number; height: number };
  effectiveDpi?: number;
  minRecommendedDpi: number;
  transparencyRequired: boolean;
  hasTransparency?: boolean;
  failures: string[];
  warnings: string[];
}

export interface OrderArtworkAudit {
  valid: boolean;
  hasFailures: boolean;
  hasWarnings: boolean;
  itemAudits: ArtworkValidationResult[];
  failures: string[];
  warnings: string[];
}

/**
 * Validates the artwork asset for a single configured order item.
 * Checks URL integrity, format, dimensions, effective DPI, and transparency requirement.
 */
export function validateItemArtwork(
  item: CartConfigurationSnapshot,
): ArtworkValidationResult {
  const config = item.configuration;
  const failures: string[] = [];
  const warnings: string[] = [];

  // 1. Resolve product & variant in approved catalog
  let product;
  try {
    product = getApprovedMerchProduct(config.merchProductId);
  } catch {
    failures.push(
      `INVALID_PRODUCT_MAPPING: Product ${config.merchProductId} not found in approved catalog.`,
    );
    return {
      valid: false,
      itemExternalId: item.id,
      designTitle: item.designTitle,
      productTitle: item.productTitle,
      variantTitle: item.variantTitle,
      productionAssetUrl: config.productionAssetUrl || '',
      minRecommendedDpi: 150,
      transparencyRequired: false,
      failures,
      warnings,
    };
  }

  const variant = product.variants.find(
    (v) => v.printifyVariantId === config.printifyVariantId,
  );
  if (!variant) {
    failures.push(
      `INVALID_VARIANT_MAPPING: Variant ID ${config.printifyVariantId} not found in product ${product.name}.`,
    );
  }

  const placeholder = variant?.placeholders.find(
    (p) =>
      p.position === config.printPosition &&
      p.decorationMethod === config.decorationMethod,
  );

  const requiredDimensions = placeholder
    ? { width: placeholder.width, height: placeholder.height }
    : undefined;

  // 2. Validate production asset URL
  const assetUrlStr = config.productionAssetUrl?.trim();
  if (!assetUrlStr) {
    failures.push('MISSING_PRODUCTION_ARTWORK: Production asset URL is empty.');
  } else {
    try {
      const parsedUrl = new URL(assetUrlStr);
      if (parsedUrl.protocol !== 'https:' && !assetUrlStr.startsWith('data:image/')) {
        failures.push(
          'UNSAFE_ARTWORK_URL: Production asset URL must use secure HTTPS.',
        );
      }
    } catch {
      failures.push(
        'INVALID_ARTWORK_URL: Production asset URL is not a valid URL.',
      );
    }
  }

  // 3. Validate image format
  const mimeType = config.designAssetMimeType?.toLowerCase();
  const urlLower = assetUrlStr?.toLowerCase() ?? '';
  const isPng =
    mimeType === 'image/png' ||
    urlLower.endsWith('.png') ||
    urlLower.includes('.png?');
  const isJpeg =
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg' ||
    urlLower.endsWith('.jpg') ||
    urlLower.endsWith('.jpeg') ||
    urlLower.includes('.jpg?') ||
    urlLower.includes('.jpeg?');
  const isWebp =
    mimeType === 'image/webp' ||
    urlLower.endsWith('.webp') ||
    urlLower.includes('.webp?');

  if (mimeType && !['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mimeType)) {
    failures.push(
      `UNSUPPORTED_ARTWORK_FORMAT: Format ${mimeType} is not supported. Use PNG or JPEG.`,
    );
  } else if (!mimeType && !isPng && !isJpeg && !isWebp && !assetUrlStr?.startsWith('data:image/')) {
    warnings.push(
      'UNKNOWN_ARTWORK_FORMAT: Could not verify MIME type from extension or metadata.',
    );
  }

  // 4. Validate Dimensions and DPI
  const width = config.designAssetWidth;
  const height = config.designAssetHeight;
  const dimensions = width && height ? { width, height } : undefined;

  let effectiveDpi: number | undefined;
  const minRecommendedDpi = 150;
  const targetDpi = 300;

  if (dimensions && placeholder) {
    const printWidth = placeholder.printWidthInches ?? (placeholder.width / 300);
    const printHeight = placeholder.printHeightInches ?? (placeholder.height / 300);
    const dpiX = printWidth > 0 ? dimensions.width / printWidth : targetDpi;
    const dpiY = printHeight > 0 ? dimensions.height / printHeight : targetDpi;
    effectiveDpi = Math.round(Math.min(dpiX, dpiY));

    if (effectiveDpi < minRecommendedDpi) {
      failures.push(
        `ARTWORK_RESOLUTION_TOO_LOW: Effective DPI is ${effectiveDpi} (minimum required is ${minRecommendedDpi} DPI; artwork is ${dimensions.width}×${dimensions.height}, print area requires ${placeholder.width}×${placeholder.height}).`,
      );
    } else if (effectiveDpi < targetDpi) {
      warnings.push(
        `ARTWORK_DPI_SUBOPTIMAL: Effective DPI is ${effectiveDpi} (target is ${targetDpi} DPI for photographic sharpness).`,
      );
    }
  } else if (!dimensions) {
    warnings.push(
      'UNVERIFIED_ARTWORK_DIMENSIONS: Artwork pixel dimensions not recorded in snapshot metadata.',
    );
  }

  // 5. Transparency Check
  const transparencyRequired =
    product.kind === 'apparel' || config.decorationMethod === 'dtg';
  const hasTransparency = config.designAssetHasTransparency;

  if (transparencyRequired) {
    if (hasTransparency === false) {
      failures.push(
        'ARTWORK_MISSING_TRANSPARENCY: Direct-to-garment apparel printing requires transparent background PNG to prevent unsightly white/black background box.',
      );
    } else if (hasTransparency === undefined && !isPng) {
      warnings.push(
        'TRANSPARENCY_UNCONFIRMED: Apparel artwork format is not confirmed PNG with alpha channel.',
      );
    }
  }

  return {
    valid: failures.length === 0,
    itemExternalId: item.id,
    designTitle: item.designTitle,
    productTitle: item.productTitle,
    variantTitle: item.variantTitle,
    productionAssetUrl: assetUrlStr || '',
    mimeType,
    dimensions,
    requiredDimensions,
    effectiveDpi,
    minRecommendedDpi,
    transparencyRequired,
    hasTransparency,
    failures,
    warnings,
  };
}

/**
 * Validates artwork across all items in an order.
 */
export function validateOrderArtwork(
  items: CartConfigurationSnapshot[],
): OrderArtworkAudit {
  const itemAudits = items.map((item) => validateItemArtwork(item));
  const failures = itemAudits.flatMap((a) => a.failures);
  const warnings = itemAudits.flatMap((a) => a.warnings);

  return {
    valid: failures.length === 0,
    hasFailures: failures.length > 0,
    hasWarnings: warnings.length > 0,
    itemAudits,
    failures,
    warnings,
  };
}
