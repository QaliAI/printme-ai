import 'server-only';

import type { CartConfigurationSnapshot } from '../types';
import {
  CatalogValidationError,
  getApprovedMerchProduct,
} from './approved-catalog';
import { getDesignCatalogService } from '../designs/service';
import { isDesignProductCompatible } from '../designs/rules';

export interface CatalogAvailability {
  isVariantAvailable(
    blueprintId: number,
    providerId: number,
    variantId: number,
  ): Promise<boolean>;
}

function assertEqual(
  actual: string | number | null,
  expected: string | number | null,
  code: string,
) {
  if (actual !== expected) {
    throw new CatalogValidationError(code, String(actual));
  }
}
export async function validateSnapshotAgainstApprovedCatalog(
  snapshot: CartConfigurationSnapshot,
  availability?: CatalogAvailability,
): Promise<void> {
  const configuration = snapshot.configuration;
  const product = getApprovedMerchProduct(configuration.merchProductId);
  const design = (await getDesignCatalogService().listPublished()).find(
    (candidate) => candidate.id === configuration.designId,
  );
  if (!design) {
    throw new CatalogValidationError(
      'DESIGN_NOT_PUBLISHED',
      configuration.designId,
    );
  }
  if (!isDesignProductCompatible(design, product.id)) {
    throw new CatalogValidationError(
      'DESIGN_PRODUCT_INCOMPATIBLE',
      `${design.id}:${product.id}`,
    );
  }
  const variant = product.variants.find(
    (candidate) =>
      candidate.printifyVariantId === configuration.printifyVariantId,
  );

  if (!variant) {
    throw new CatalogValidationError(
      'VARIANT_NOT_APPROVED',
      String(configuration.printifyVariantId),
    );
  }
  if (!variant.available) {
    throw new CatalogValidationError('VARIANT_UNAVAILABLE', variant.id);
  }

  assertEqual(
    configuration.printifyBlueprintId,
    product.printifyBlueprintId,
    'BLUEPRINT_MISMATCH',
  );
  assertEqual(
    configuration.printifyProviderId,
    product.provider.printifyProviderId,
    'PROVIDER_MISMATCH',
  );
  assertEqual(configuration.unitPrice, variant.unitPrice, 'PRICE_MISMATCH');
  assertEqual(configuration.currency, variant.currency, 'CURRENCY_MISMATCH');
  assertEqual(configuration.selectedColor, variant.color, 'COLOR_MISMATCH');
  assertEqual(configuration.selectedSize, variant.size, 'SIZE_MISMATCH');
  assertEqual(snapshot.productTitle, product.name, 'PRODUCT_TITLE_MISMATCH');
  assertEqual(snapshot.variantTitle, variant.title, 'VARIANT_TITLE_MISMATCH');
  assertEqual(snapshot.designTitle, design.title, 'DESIGN_TITLE_MISMATCH');
  assertEqual(
    configuration.designVersion,
    design.asset.version,
    'DESIGN_VERSION_MISMATCH',
  );
  assertEqual(
    configuration.designAssetUrl,
    design.asset.url,
    'DESIGN_ASSET_MISMATCH',
  );
  assertEqual(
    configuration.productionAssetUrl,
    design.asset.productionUrl ?? design.asset.url,
    'PRODUCTION_ASSET_MISMATCH',
  );

  const placeholder = variant.placeholders.find(
    (candidate) =>
      candidate.position === configuration.printPosition &&
      candidate.decorationMethod === configuration.decorationMethod,
  );
  if (!placeholder) {
    throw new CatalogValidationError(
      'PLACEMENT_NOT_APPROVED',
      `${configuration.printPosition}:${configuration.decorationMethod}`,
    );
  }

  if (
    availability &&
    !(await availability.isVariantAvailable(
      product.printifyBlueprintId,
      product.provider.printifyProviderId,
      variant.printifyVariantId,
    ))
  ) {
    throw new CatalogValidationError('VARIANT_STALE', variant.id);
  }
}
