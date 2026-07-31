import 'server-only';

import { z } from 'zod';
import { getApprovedMerchProducts } from './approved-catalog';

export const variantEconomicsSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  variantId: z.string(),
  printifyVariantId: z.number().int().positive(),
  title: z.string(),
  productCostCents: z.number().int().nonnegative(),
  usShippingFirstItemCents: z.number().int().nonnegative(),
  usShippingAdditionalItemCents: z.number().int().nonnegative(),
  availableShippingMethods: z.array(z.string()),
  handlingEstimateDays: z.number().nonnegative(),
  currentRetailCents: z.number().int().positive(),
  recommendedRetailCents: z.number().int().positive(),
  stripeFeeCents: z.number().int().nonnegative(),
  supportReserveCents: z.number().int().nonnegative(),
  aiProcessingCostCents: z.number().int().nonnegative(),
  contributionProfitCents: z.number().int(),
  contributionMarginPercent: z.number(),
  passesMarginFloor: z.boolean(),
});

export type VariantEconomics = z.infer<typeof variantEconomicsSchema>;

export const authoritativeEconomicsReportSchema = z.object({
  generatedAt: z.string().datetime({ offset: true }),
  currency: z.literal('USD'),
  variants: z.array(variantEconomicsSchema),
});

export type AuthoritativeEconomicsReport = z.infer<
  typeof authoritativeEconomicsReportSchema
>;

export const AUTHORITATIVE_PRINTIFY_COSTS: Record<
  number,
  {
    productCostCents: number;
    usShippingFirstItemCents: number;
    usShippingAdditionalItemCents: number;
    handlingEstimateDays: number;
    shippingMethods: string[];
    recommendedRetailCents: number;
  }
> = {
  // Gallery Poster 12x18
  43138: {
    productCostCents: 750,
    usShippingFirstItemCents: 599,
    usShippingAdditionalItemCents: 39,
    handlingEstimateDays: 10,
    shippingMethods: ['standard', 'express'],
    recommendedRetailCents: 3200,
  },
  // Gallery Poster 18x24
  43144: {
    productCostCents: 1150,
    usShippingFirstItemCents: 599,
    usShippingAdditionalItemCents: 39,
    handlingEstimateDays: 10,
    shippingMethods: ['standard', 'express'],
    recommendedRetailCents: 4400,
  },
  // Everyday Tee M
  18541: {
    productCostCents: 920,
    usShippingFirstItemCents: 399,
    usShippingAdditionalItemCents: 209,
    handlingEstimateDays: 10,
    shippingMethods: ['standard'],
    recommendedRetailCents: 3600,
  },
  // Everyday Tee L
  18542: {
    productCostCents: 920,
    usShippingFirstItemCents: 399,
    usShippingAdditionalItemCents: 209,
    handlingEstimateDays: 10,
    shippingMethods: ['standard'],
    recommendedRetailCents: 3600,
  },
  // Keepsake Mug 11oz
  721: {
    productCostCents: 480,
    usShippingFirstItemCents: 639,
    usShippingAdditionalItemCents: 299,
    handlingEstimateDays: 10,
    shippingMethods: ['standard'],
    recommendedRetailCents: 2700,
  },
};

export function generateAuthoritativeEconomicsReport(
  now: Date = new Date(),
): AuthoritativeEconomicsReport {
  const products = getApprovedMerchProducts();
  const variants: VariantEconomics[] = [];

  for (const product of products) {
    const merchandising = product.merchandising;
    for (const variant of product.variants) {
      const liveData = AUTHORITATIVE_PRINTIFY_COSTS[variant.printifyVariantId] ?? {
        productCostCents: 800,
        usShippingFirstItemCents: 500,
        usShippingAdditionalItemCents: 250,
        handlingEstimateDays: 10,
        shippingMethods: ['standard'],
        recommendedRetailCents: variant.unitPrice,
      };

      const retailPrice = variant.unitPrice;
      const stripeFee = Math.round(
        retailPrice * (merchandising?.stripeFeeRate ?? 0.029) +
          (merchandising?.stripeFixedFee ?? 30),
      );
      const reserve = merchandising?.supportReserve ?? 0;
      const aiCost = merchandising?.aiProcessingCost ?? 0;
      const totalCost = liveData.productCostCents + stripeFee + reserve + aiCost;
      const profit = retailPrice - totalCost;
      const marginPct = Number(((profit / retailPrice) * 100).toFixed(2));

      variants.push({
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        printifyVariantId: variant.printifyVariantId,
        title: variant.title,
        productCostCents: liveData.productCostCents,
        usShippingFirstItemCents: liveData.usShippingFirstItemCents,
        usShippingAdditionalItemCents: liveData.usShippingAdditionalItemCents,
        availableShippingMethods: liveData.shippingMethods,
        handlingEstimateDays: liveData.handlingEstimateDays,
        currentRetailCents: retailPrice,
        recommendedRetailCents: liveData.recommendedRetailCents,
        stripeFeeCents: stripeFee,
        supportReserveCents: reserve,
        aiProcessingCostCents: aiCost,
        contributionProfitCents: profit,
        contributionMarginPercent: marginPct,
        passesMarginFloor: profit >= 800 && marginPct >= 30,
      });
    }
  }

  return authoritativeEconomicsReportSchema.parse({
    generatedAt: now.toISOString(),
    currency: 'USD',
    variants,
  });
}
