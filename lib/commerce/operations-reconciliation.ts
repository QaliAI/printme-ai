import 'server-only';

import { z } from 'zod';

export const reconciliationAlertSchema = z.object({
  type: z.enum([
    'PAYMENT_WITHOUT_DRAFT',
    'DRAFT_WITHOUT_PAYMENT',
    'STATUS_MISMATCH',
    'UNCERTAIN_FULFILLMENT',
  ]),
  severity: z.enum(['high', 'medium', 'low']),
  orderId: z.string(),
  message: z.string(),
  printifyOrderId: z.string().nullable().optional(),
  detectedAt: z.string().datetime({ offset: true }),
});

export type ReconciliationAlert = z.infer<typeof reconciliationAlertSchema>;

export interface OrderReconciliationItem {
  id: string;
  orderNumber: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  printifyOrderId: string | null;
  productionSubmittedAt: string | null;
  createdAt: string;
}

export interface ReconciliationReport {
  generatedAt: string;
  totalOrdersChecked: number;
  paidOrdersCount: number;
  draftOrdersCount: number;
  submittedOrdersCount: number;
  alerts: ReconciliationAlert[];
}

export function reconcileOrders(
  orders: OrderReconciliationItem[],
  now = new Date(),
): ReconciliationReport {
  const alerts: ReconciliationAlert[] = [];
  let paidCount = 0;
  let draftCount = 0;
  let submittedCount = 0;

  for (const order of orders) {
    const isPaid = order.paymentStatus === 'paid';
    const hasDraft = Boolean(order.printifyOrderId);
    const isSubmitted = Boolean(order.productionSubmittedAt);

    if (isPaid) paidCount += 1;
    if (hasDraft) draftCount += 1;
    if (isSubmitted) submittedCount += 1;

    // Alert 1: Payment without draft (high severity)
    if (isPaid && !hasDraft && order.fulfillmentStatus !== 'dry_run_complete') {
      alerts.push({
        type: 'PAYMENT_WITHOUT_DRAFT',
        severity: 'high',
        orderId: order.id,
        message: `Order ${order.orderNumber} is paid but has no Printify draft order.`,
        printifyOrderId: null,
        detectedAt: now.toISOString(),
      });
    }

    // Alert 2: Draft without payment (high severity - potential revenue loss / unpaid fulfillment)
    if (hasDraft && !isPaid) {
      alerts.push({
        type: 'DRAFT_WITHOUT_PAYMENT',
        severity: 'high',
        orderId: order.id,
        message: `Order ${order.orderNumber} has a Printify draft order ${order.printifyOrderId} but payment status is '${order.paymentStatus}'.`,
        printifyOrderId: order.printifyOrderId,
        detectedAt: now.toISOString(),
      });
    }

    // Alert 3: Uncertain / stuck fulfillment
    if (order.fulfillmentStatus === 'fulfillment_failed' || order.fulfillmentStatus === 'manual_review_uncertain') {
      alerts.push({
        type: 'UNCERTAIN_FULFILLMENT',
        severity: 'medium',
        orderId: order.id,
        message: `Order ${order.orderNumber} requires manual operational review due to fulfillment failure or uncertain state.`,
        printifyOrderId: order.printifyOrderId,
        detectedAt: now.toISOString(),
      });
    }
  }

  return {
    generatedAt: now.toISOString(),
    totalOrdersChecked: orders.length,
    paidOrdersCount: paidCount,
    draftOrdersCount: draftCount,
    submittedOrdersCount: submittedCount,
    alerts,
  };
}
