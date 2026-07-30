import { calculateContributionMargin } from './margin';
import { createProductConfiguration } from './placement';
import { getPreviewTemplate } from './templates';
import type {
  CartConfigurationSnapshot,
  DesignAsset,
  MerchProduct,
} from './types';

export interface SameDesignUpsell {
  sourceItemId: string;
  product: MerchProduct;
  design: DesignAsset;
  configuration: ReturnType<typeof createProductConfiguration>;
  contributionMargin: number;
}

export function designAssetFromSnapshot(
  item: CartConfigurationSnapshot,
): DesignAsset | null {
  const configuration = item.configuration;
  if (!configuration.designAssetWidth || !configuration.designAssetHeight) {
    return null;
  }
  return {
    id: configuration.designAssetId ?? configuration.designId,
    version:
      configuration.designVersionId ?? configuration.designVersion,
    url: configuration.designAssetUrl,
    productionUrl: configuration.productionAssetUrl,
    alt: configuration.designAssetAlt ?? item.designTitle,
    width: configuration.designAssetWidth,
    height: configuration.designAssetHeight,
    mimeType: configuration.designAssetMimeType ?? 'image/png',
    hasTransparency:
      configuration.designAssetHasTransparency ?? false,
    sourceType: configuration.designSourceType,
    role: configuration.designDerivativeId
      ? 'product-derivative'
      : 'production',
    productionAssetId: configuration.productionAssetId,
    derivativeId: configuration.designDerivativeId,
    storageKey: configuration.designAssetStorageKey,
  };
}

export function getSameDesignUpsells(input: {
  sourceItem: CartConfigurationSnapshot;
  cartItems: CartConfigurationSnapshot[];
  products: MerchProduct[];
  compatibleProductIds?: string[];
}): SameDesignUpsell[] {
  const design = designAssetFromSnapshot(input.sourceItem);
  if (!design) return [];
  const presentProducts = new Set(
    input.cartItems
      .filter(
        (item) =>
          item.configuration.designId ===
            input.sourceItem.configuration.designId &&
          item.configuration.designVersion ===
            input.sourceItem.configuration.designVersion,
      )
      .map((item) => item.configuration.merchProductId),
  );
  const allowed = input.compatibleProductIds
    ? new Set(input.compatibleProductIds)
    : null;

  return input.products.flatMap((product) => {
    if (
      presentProducts.has(product.id) ||
      (allowed && !allowed.has(product.id))
    ) {
      return [];
    }
    const variant =
      product.variants.find((candidate) => candidate.available) ??
      product.variants[0];
    const margin = calculateContributionMargin(product, variant);
    if (
      !margin.complete ||
      margin.contributionMargin === null ||
      margin.contributionMargin <= 0
    ) {
      return [];
    }
    return [
      {
        sourceItemId: input.sourceItem.id,
        product,
        design,
        configuration: createProductConfiguration({
          designId: input.sourceItem.configuration.designId,
          design,
          product,
          template: getPreviewTemplate(product.previewTemplateId),
        }),
        contributionMargin: margin.contributionMargin,
      },
    ];
  });
}
