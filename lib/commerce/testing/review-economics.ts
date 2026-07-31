import 'server-only';

import type { MerchProduct } from '../types';

export function applyCommerceE2EReviewEconomics(
  products: MerchProduct[],
  suppliedSecret: string | undefined,
) {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.COMMERCE_E2E_TEST_MODE !== 'true' ||
    !process.env.COMMERCE_E2E_TEST_SECRET ||
    suppliedSecret !== process.env.COMMERCE_E2E_TEST_SECRET
  ) {
    return products;
  }
  for (const product of products) {
    if (product.merchandising) {
      product.merchandising.shippingCost = 500;
    }
    for (const variant of product.variants) {
      variant.unitCost = 700;
    }
  }
  return products;
}
