import 'server-only';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';

/** No invented provider IDs, costs, delivery promises or unsupported products. */
export function getPetsKeepsakes() {
  const ids = ['gallery-poster', 'keepsake-mug', 'everyday-tee'];
  const products = getApprovedMerchProducts();
  return ids.flatMap(id => {
    const product = products.find(candidate => candidate.id === id);
    if (!product || !product.printifyBlueprintId || !product.provider.printifyProviderId) return [];
    const available = product.variants.filter(variant => variant.available && variant.printifyVariantId > 0);
    if (!available.length) return [];
    return [{ product, fromPrice: Math.min(...available.map(variant => variant.unitPrice)),
      economicsVerified: available.every(variant => typeof variant.unitCost === 'number') && typeof product.merchandising?.shippingCost === 'number' }];
  });
}
