import type { CuratedDesignRecord } from './models';
import type { MerchProduct } from '../types';

export class IncompatibleDesignProductError extends Error {
  constructor(designId: string, productId: string) {
    super(`Design ${designId} is not compatible with product ${productId}.`);
    this.name = 'IncompatibleDesignProductError';
  }
}

export function isDesignProductCompatible(
  design: CuratedDesignRecord,
  productId: string,
) {
  return (
    design.compatibleProductIds.includes(productId) &&
    !design.incompatibleProductIds.includes(productId)
  );
}

export function assertDesignProductCompatible(
  design: CuratedDesignRecord,
  productId: string,
) {
  if (!isDesignProductCompatible(design, productId)) {
    throw new IncompatibleDesignProductError(design.id, productId);
  }
}

export function getRecommendedProduct(
  design: CuratedDesignRecord,
  products: MerchProduct[],
) {
  const recommended = products.find(
    (product) => product.id === design.recommendedProductId,
  );
  if (recommended && isDesignProductCompatible(design, recommended.id)) {
    return recommended;
  }

  const fallback = products.find((product) =>
    isDesignProductCompatible(design, product.id),
  );
  if (!fallback) {
    throw new IncompatibleDesignProductError(design.id, 'no-approved-product');
  }
  return fallback;
}
