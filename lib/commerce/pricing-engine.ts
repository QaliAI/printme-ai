import 'server-only';

import { z } from 'zod';
import type { MerchProduct, ProductVariant } from './types';

export type ShippingModel = 'customer-paid' | 'merchant-paid';

export interface PricingPolicyConfig {
  minDollarProfitCents: number;
  minMarginPercentage: number;
  targetMarginMinPercentage: number;
  targetMarginMaxPercentage: number;
  staleDataMaxAgeMs: number;
  shippingModel: ShippingModel;
}

export const DEFAULT_PRICING_POLICY: PricingPolicyConfig = {
  minDollarProfitCents: 800, // $8.00
  minMarginPercentage: 30, // 30%
  targetMarginMinPercentage: 35, // 35%
  targetMarginMaxPercentage: 45, // 45%
  staleDataMaxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
  shippingModel: 'customer-paid',
};

export const pricingAuditMetadataSchema = z.object({
  costSnapshotId: z.string(),
  costSnapshotTimestamp: z.string().datetime({ offset: true }),
  providerId: z.number().int().positive(),
  blueprintId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  productCostCents: z.number().int().nonnegative(),
  shippingCostCents: z.number().int().nonnegative(),
  shippingModel: z.enum(['customer-paid', 'merchant-paid']),
  stripeFeeCents: z.number().int().nonnegative(),
  supportReserveCents: z.number().int().nonnegative(),
  aiProcessingCostCents: z.number().int().nonnegative(),
  retailPriceCents: z.number().int().positive(),
  discountCents: z.number().int().nonnegative(),
  effectiveRetailCents: z.number().int().positive(),
  contributionProfitCents: z.number().int(),
  contributionMarginPercent: z.number(),
  passedGates: z.boolean(),
  gateFailures: z.array(z.string()),
});

export type PricingAuditMetadata = z.infer<typeof pricingAuditMetadataSchema>;

export interface PriceEvaluation {
  valid: boolean;
  unitPriceCents: number;
  discountCents: number;
  effectiveUnitPriceCents: number;
  contributionProfitCents: number | null;
  contributionMarginPercent: number | null;
  audit: PricingAuditMetadata;
  gateFailures: string[];
}

export function recommendTargetPriceCents(
  productCostCents: number,
  shippingCostCents: number,
  targetMarginPct = 40,
  shippingModel: ShippingModel = 'customer-paid',
  supportReserveCents = 250,
  aiProcessingCostCents = 0,
  stripeFeeRate = 0.029,
  stripeFixedFeeCents = 30,
): number {
  const absorbedShipping = shippingModel === 'merchant-paid' ? shippingCostCents : 0;
  const baseCost = productCostCents + absorbedShipping + supportReserveCents + aiProcessingCostCents;
  const marginFraction = targetMarginPct / 100;
  
  // retail * (1 - marginFraction - stripeFeeRate) = baseCost + stripeFixedFeeCents
  const divisor = 1 - marginFraction - stripeFeeRate;
  if (divisor <= 0) {
    throw new Error('Invalid target margin percentage or stripe fee rate.');
  }
  
  const rawRetail = (baseCost + stripeFixedFeeCents) / divisor;
  return Math.ceil(rawRetail / 100) * 100; // round up to nearest dollar
}

export function evaluateVariantPrice(params: {
  product: MerchProduct;
  variant: ProductVariant;
  snapshotTimestamp?: string;
  costSnapshotId?: string;
  shippingCostCents?: number | null;
  discountCents?: number;
  policy?: Partial<PricingPolicyConfig>;
  now?: Date;
}): PriceEvaluation {
  const now = params.now ?? new Date();
  const policy: PricingPolicyConfig = {
    ...DEFAULT_PRICING_POLICY,
    ...params.policy,
  };

  const gateFailures: string[] = [];

  // 1. Missing cost gate
  const productCostCents = params.variant.unitCost;
  if (productCostCents == null) {
    gateFailures.push('MISSING_PRODUCT_COST: Variant product cost is missing.');
  }

  // 2. Shipping cost gate
  const shippingCostCents =
    params.shippingCostCents ?? params.product.merchandising?.shippingCost ?? null;
  if (shippingCostCents == null) {
    gateFailures.push('MISSING_SHIPPING_COST: Shipping cost is missing.');
  }

  // 3. Stale data gate
  const snapshotTime = params.snapshotTimestamp
    ? new Date(params.snapshotTimestamp)
    : now;
  const ageMs = now.getTime() - snapshotTime.getTime();
  if (ageMs > policy.staleDataMaxAgeMs) {
    gateFailures.push(`STALE_ECONOMICS_DATA: Economics snapshot is ${Math.round(ageMs / 1000 / 3600)} hours old.`);
  }

  const retailPriceCents = params.variant.unitPrice;
  const discountCents = params.discountCents ?? 0;
  const effectiveRetailCents = Math.max(0, retailPriceCents - discountCents);

  const merchandising = params.product.merchandising;
  const stripeFeeRate = merchandising?.stripeFeeRate ?? 0.029;
  const stripeFixedFeeCents = merchandising?.stripeFixedFee ?? 30;
  const stripeFeeCents = Math.round(effectiveRetailCents * stripeFeeRate + stripeFixedFeeCents);
  const supportReserveCents = merchandising?.supportReserve ?? 0;
  const aiProcessingCostCents = merchandising?.aiProcessingCost ?? 0;

  const safeProductCost = productCostCents ?? 0;
  const safeShippingCost = shippingCostCents ?? 0;
  const absorbedShippingCents =
    policy.shippingModel === 'merchant-paid' ? safeShippingCost : 0;

  const totalCostCents =
    safeProductCost +
    absorbedShippingCents +
    stripeFeeCents +
    supportReserveCents +
    aiProcessingCostCents;

  const contributionProfitCents = effectiveRetailCents - totalCostCents;
  const marginPct =
    effectiveRetailCents > 0
      ? Number(((contributionProfitCents / effectiveRetailCents) * 100).toFixed(2))
      : 0;

  // 4. Minimum dollar profit gate ($8.00 floor)
  if (productCostCents != null && shippingCostCents != null) {
    if (contributionProfitCents < policy.minDollarProfitCents) {
      gateFailures.push(
        `MARGIN_BELOW_PROFIT_FLOOR: Profit of ${contributionProfitCents} cents is below the ${policy.minDollarProfitCents} cents ($8.00) floor.`,
      );
    }

    // 5. Minimum margin percentage gate (30% floor)
    if (marginPct < policy.minMarginPercentage) {
      gateFailures.push(
        `MARGIN_BELOW_PERCENT_FLOOR: Margin of ${marginPct}% is below the ${policy.minMarginPercentage}% floor.`,
      );
    }
  }

  // 6. Discount floor check
  if (discountCents > 0 && productCostCents != null && shippingCostCents != null) {
    const undiscountedProfit = retailPriceCents - (safeProductCost + absorbedShippingCents + Math.round(retailPriceCents * stripeFeeRate + stripeFixedFeeCents) + supportReserveCents + aiProcessingCostCents);
    const maxDiscountCents = Math.max(0, undiscountedProfit - policy.minDollarProfitCents);
    if (discountCents > maxDiscountCents) {
      gateFailures.push(
        `DISCOUNT_EXCEEDS_FLOOR: Discount of ${discountCents} cents exceeds the max allowable discount of ${maxDiscountCents} cents without breaching profit floor.`,
      );
    }
  }

  const passedGates = gateFailures.length === 0;

  const audit: PricingAuditMetadata = {
    costSnapshotId: params.costSnapshotId ?? `snapshot-${params.product.id}-${params.variant.id}`,
    costSnapshotTimestamp: snapshotTime.toISOString(),
    providerId: params.product.provider.printifyProviderId,
    blueprintId: params.product.printifyBlueprintId,
    variantId: params.variant.printifyVariantId,
    productCostCents: safeProductCost,
    shippingCostCents: safeShippingCost,
    shippingModel: policy.shippingModel,
    stripeFeeCents,
    supportReserveCents,
    aiProcessingCostCents,
    retailPriceCents,
    discountCents,
    effectiveRetailCents,
    contributionProfitCents,
    contributionMarginPercent: marginPct,
    passedGates,
    gateFailures,
  };

  return {
    valid: passedGates,
    unitPriceCents: retailPriceCents,
    discountCents,
    effectiveUnitPriceCents: effectiveRetailCents,
    contributionProfitCents: productCostCents != null && shippingCostCents != null ? contributionProfitCents : null,
    contributionMarginPercent: productCostCents != null && shippingCostCents != null ? marginPct : null,
    audit: pricingAuditMetadataSchema.parse(audit),
    gateFailures,
  };
}
