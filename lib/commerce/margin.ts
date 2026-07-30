import type { MerchProduct, ProductVariant } from './types';

export interface ContributionMargin {
  complete: boolean;
  retailPrice: number;
  productCost: number | null;
  shippingCost: number | null;
  stripeFee: number;
  aiProcessingCost: number;
  supportReserve: number;
  contributionMargin: number | null;
}

export function calculateContributionMargin(
  product: MerchProduct,
  variant: ProductVariant,
): ContributionMargin {
  const merchandising = product.merchandising;
  const stripeFee = merchandising
    ? Math.round(
        variant.unitPrice * merchandising.stripeFeeRate +
          merchandising.stripeFixedFee,
      )
    : 0;
  const productCost = variant.unitCost ?? null;
  const shippingCost = merchandising?.shippingCost ?? null;
  const complete =
    productCost !== null &&
    shippingCost !== null &&
    Boolean(merchandising);
  return {
    complete,
    retailPrice: variant.unitPrice,
    productCost,
    shippingCost,
    stripeFee,
    aiProcessingCost: merchandising?.aiProcessingCost ?? 0,
    supportReserve: merchandising?.supportReserve ?? 0,
    contributionMargin: complete
      ? variant.unitPrice -
        productCost -
        shippingCost -
        stripeFee -
        (merchandising?.aiProcessingCost ?? 0) -
        (merchandising?.supportReserve ?? 0)
      : null,
  };
}

export function getProductCheckoutReadiness(product: MerchProduct) {
  const hasTemplate = Boolean(product.previewTemplateId);
  const variants = product.variants.filter((variant) => variant.available);
  const blockers = [
    !variants.length ? 'No available approved variants' : null,
    variants.some((variant) => variant.unitCost == null)
      ? 'Provider unit cost is not synchronized'
      : null,
    product.merchandising?.shippingCost == null
      ? 'Provider shipping cost is not synchronized'
      : null,
    !product.provider.printifyProviderId
      ? 'Provider mapping is missing'
      : null,
    !hasTemplate ? 'Preview template is missing' : null,
  ].filter((item): item is string => Boolean(item));
  return { ready: blockers.length === 0, blockers };
}
