import { z } from 'zod';
import { calculateContributionMargin } from './margin';
import type { MerchProduct } from './types';

export const bundleQuoteRequestSchema = z.object({
  requestedDiscountRate: z.number().min(0).max(0.25).default(0.1),
  items: z
    .array(
      z.object({
        designVersion: z.string().min(1).max(120),
        productId: z.string().min(1).max(120),
        variantId: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(2)
    .max(20),
});

export interface BundleQuote {
  eligible: boolean;
  subtotal: number;
  discount: number;
  contributionMarginAfterDiscount: number | null;
  freeShippingThreshold: number | null;
  freeShippingProgress: number | null;
  reason: string | null;
}

export function calculateBundleQuote(
  input: z.infer<typeof bundleQuoteRequestSchema>,
  products: MerchProduct[],
): BundleQuote {
  const request = bundleQuoteRequestSchema.parse(input);
  if (new Set(request.items.map((item) => item.designVersion)).size !== 1) {
    return ineligible('Bundle items must use the same design version.');
  }

  let subtotal = 0;
  let contributionMargin = 0;
  let shippingCost = 0;
  for (const item of request.items) {
    const product = products.find(
      (candidate) => candidate.id === item.productId,
    );
    const variant = product?.variants.find(
      (candidate) => candidate.id === item.variantId && candidate.available,
    );
    if (!product || !variant) {
      return ineligible('Bundle contains an unapproved product variant.');
    }
    const margin = calculateContributionMargin(product, variant);
    if (
      !margin.complete ||
      margin.contributionMargin === null ||
      margin.contributionMargin <= 0 ||
      margin.shippingCost === null
    ) {
      return ineligible(
        'Provider cost and shipping data must be synchronized first.',
      );
    }
    subtotal += variant.unitPrice * item.quantity;
    contributionMargin += margin.contributionMargin * item.quantity;
    shippingCost += margin.shippingCost * item.quantity;
  }

  const requestedDiscount = Math.round(
    subtotal * request.requestedDiscountRate,
  );
  const discount = Math.max(
    0,
    Math.min(requestedDiscount, contributionMargin - 1),
  );
  const freeShippingThreshold = Math.max(
    5000,
    Math.ceil((shippingCost * 5) / 100) * 100,
  );

  return {
    eligible: discount > 0,
    subtotal,
    discount,
    contributionMarginAfterDiscount: contributionMargin - discount,
    freeShippingThreshold,
    freeShippingProgress: Math.min(1, subtotal / freeShippingThreshold),
    reason: discount > 0 ? null : 'No margin-safe discount is available.',
  };
}

function ineligible(reason: string): BundleQuote {
  return {
    eligible: false,
    subtotal: 0,
    discount: 0,
    contributionMarginAfterDiscount: null,
    freeShippingThreshold: null,
    freeShippingProgress: null,
    reason,
  };
}
