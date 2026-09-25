import 'server-only';

import { getApprovedMerchProduct } from '../catalog/approved-catalog';
import { AUTHORITATIVE_PRINTIFY_COSTS } from '../catalog/economics-report';
import { DEFAULT_PRICING_POLICY, type PricingPolicyConfig } from '../pricing-engine';
import type { CartConfigurationSnapshot } from '../types';

export interface ItemEconomicsEvaluation {
  itemExternalId: string;
  designTitle: string;
  productTitle: string;
  variantTitle: string;
  quantity: number;
  printifyVariantId: number;
  unitRetailCents: number;
  totalRetailCents: number;
  unitProductCostCents: number;
  totalProductCostCents: number;
  estimatedShippingCents: number;
  stripeFeeCents: number;
  supportReserveCents: number;
  totalCostCents: number;
  contributionProfitCents: number;
  contributionMarginPercent: number;
  passesMarginFloor: boolean;
  failures: string[];
}

export interface OrderEconomicsAudit {
  valid: boolean;
  currency: 'USD';
  itemsTotalRetailCents: number;
  shippingPaidCents: number;
  grossRevenueCents: number;
  totalProductCostCents: number;
  totalFulfillmentShippingCents: number;
  totalStripeFeeCents: number;
  totalSupportReserveCents: number;
  totalCostCents: number;
  netContributionProfitCents: number;
  contributionMarginPercent: number;
  passesMarginFloor: boolean;
  itemEvaluations: ItemEconomicsEvaluation[];
  blockingReasons: string[];
}

/**
 * Evaluates the economics and margin floor for every item in an order.
 * Ensures the order meets or exceeds the required profit ($8.00) and margin (30%) floors.
 */
export function evaluateOrderEconomics(
  items: CartConfigurationSnapshot[],
  shippingPaidCents: number = 0,
  policy: PricingPolicyConfig = DEFAULT_PRICING_POLICY,
): OrderEconomicsAudit {
  const itemEvaluations: ItemEconomicsEvaluation[] = [];
  const blockingReasons: string[] = [];

  let itemsTotalRetail = 0;
  let totalProductCost = 0;
  let totalFulfillmentShipping = 0;
  let totalStripeFee = 0;
  let totalSupportReserve = 0;

  for (const item of items) {
    const config = item.configuration;
    const failures: string[] = [];

    // Find cost from authoritative lookup or variant snapshot
    const liveCostData = AUTHORITATIVE_PRINTIFY_COSTS[config.printifyVariantId];
    const unitProductCostCents =
      liveCostData?.productCostCents ?? item.productCost ?? 0;

    if (!liveCostData && item.productCost == null) {
      failures.push(
        `MISSING_PRODUCT_COST: Authoritative Printify cost unknown for variant ID ${config.printifyVariantId}.`,
      );
    }

    let product;
    try {
      product = getApprovedMerchProduct(config.merchProductId);
    } catch {
      failures.push(
        `UNKNOWN_PRODUCT: Merch product ${config.merchProductId} not found.`,
      );
    }

    const merchandising = product?.merchandising;
    const stripeFeeRate = merchandising?.stripeFeeRate ?? 0.029;
    const stripeFixedFee = merchandising?.stripeFixedFee ?? 30;
    const supportReserve = merchandising?.supportReserve ?? 250;

    const unitRetailCents = item.configuration.unitPrice;
    const totalRetailCents = unitRetailCents * item.quantity;
    const totalCostForItems = unitProductCostCents * item.quantity;

    // Shipping estimate: first item + additional items
    const firstItemShipping = liveCostData?.usShippingFirstItemCents ?? 499;
    const additionalItemShipping = liveCostData?.usShippingAdditionalItemCents ?? 209;
    const estimatedShipping =
      item.quantity > 1
        ? firstItemShipping + (item.quantity - 1) * additionalItemShipping
        : firstItemShipping;

    // Prorated Stripe fee
    const stripeFeeCents = Math.round(
      totalRetailCents * stripeFeeRate + (stripeFixedFee / items.length),
    );
    const itemSupportReserveCents = supportReserve * item.quantity;

    const itemTotalCost =
      totalCostForItems +
      (policy.shippingModel === 'merchant-paid' ? estimatedShipping : 0) +
      stripeFeeCents +
      itemSupportReserveCents;

    const profitCents = totalRetailCents - itemTotalCost;
    const marginPct =
      totalRetailCents > 0
        ? Number(((profitCents / totalRetailCents) * 100).toFixed(2))
        : 0;

    // Check margin floor ($8.00 / 30% per item)
    if (profitCents < policy.minDollarProfitCents * item.quantity) {
      failures.push(
        `MARGIN_BELOW_PROFIT_FLOOR: Profit of $${(profitCents / 100).toFixed(2)} is below minimum floor of $${((policy.minDollarProfitCents * item.quantity) / 100).toFixed(2)}.`,
      );
    }
    if (marginPct < policy.minMarginPercentage) {
      failures.push(
        `MARGIN_BELOW_PERCENT_FLOOR: Gross margin of ${marginPct}% is below required ${policy.minMarginPercentage}% floor.`,
      );
    }

    const passesMarginFloor = failures.length === 0;
    if (!passesMarginFloor) {
      blockingReasons.push(...failures);
    }

    itemsTotalRetail += totalRetailCents;
    totalProductCost += totalCostForItems;
    totalFulfillmentShipping += estimatedShipping;
    totalStripeFee += stripeFeeCents;
    totalSupportReserve += itemSupportReserveCents;

    itemEvaluations.push({
      itemExternalId: item.id,
      designTitle: item.designTitle,
      productTitle: item.productTitle,
      variantTitle: item.variantTitle,
      quantity: item.quantity,
      printifyVariantId: config.printifyVariantId,
      unitRetailCents,
      totalRetailCents,
      unitProductCostCents,
      totalProductCostCents: totalCostForItems,
      estimatedShippingCents: estimatedShipping,
      stripeFeeCents,
      supportReserveCents: itemSupportReserveCents,
      totalCostCents: itemTotalCost,
      contributionProfitCents: profitCents,
      contributionMarginPercent: marginPct,
      passesMarginFloor,
      failures,
    });
  }

  const grossRevenue = itemsTotalRetail + shippingPaidCents;
  const totalCost =
    totalProductCost +
    (policy.shippingModel === 'merchant-paid' ? totalFulfillmentShipping : 0) +
    totalStripeFee +
    totalSupportReserve;

  const netProfit = itemsTotalRetail - totalCost;
  const overallMargin =
    itemsTotalRetail > 0
      ? Number(((netProfit / itemsTotalRetail) * 100).toFixed(2))
      : 0;

  const orderPassesFloor =
    blockingReasons.length === 0 &&
    netProfit >= policy.minDollarProfitCents &&
    overallMargin >= policy.minMarginPercentage;

  return {
    valid: orderPassesFloor,
    currency: 'USD',
    itemsTotalRetailCents: itemsTotalRetail,
    shippingPaidCents,
    grossRevenueCents: grossRevenue,
    totalProductCostCents: totalProductCost,
    totalFulfillmentShippingCents: totalFulfillmentShipping,
    totalStripeFeeCents: totalStripeFee,
    totalSupportReserveCents: totalSupportReserve,
    totalCostCents: totalCost,
    netContributionProfitCents: netProfit,
    contributionMarginPercent: overallMargin,
    passesMarginFloor: orderPassesFloor,
    itemEvaluations,
    blockingReasons,
  };
}
