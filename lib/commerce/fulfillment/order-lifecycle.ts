import 'server-only';

import {
  type OrderArtworkAudit,
  validateOrderArtwork,
} from './artwork-validator';
import {
  type OrderEconomicsAudit,
  evaluateOrderEconomics,
} from './economics-validator';
import type { CartConfigurationSnapshot } from '../types';

export type OperatorQueueTab =
  | 'NEEDS_REVIEW'
  | 'READY_FOR_PRODUCTION'
  | 'BLOCKED'
  | 'SUBMITTED'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'EXCEPTION';

export type OrderLifecycleState =
  | 'checkout'
  | 'paid'
  | 'artwork_ready'
  | 'fulfillment_ready'
  | 'submitted'
  | 'in_production'
  | 'shipped'
  | 'completed'
  | 'blocked'
  | 'exception';

export interface OrderLifecycleAudit {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  paymentStatus: string;
  orderStatus: string;
  fulfillmentStatus: string;
  jobState: string | null;
  printifyOrderId: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  operatorTab: OperatorQueueTab;
  canonicalLifecycleState: OrderLifecycleState;
  canApprove: boolean;
  canDryRun: boolean;
  blockingReasons: string[];
  warnings: string[];
  artworkAudit: OrderArtworkAudit;
  economicsAudit: OrderEconomicsAudit;
}

export interface RawOrderForLifecycle {
  id: string;
  order_number?: string | null;
  created_at: string;
  status?: string | null;
  payment_status?: string | null;
  fulfillment_status?: string | null;
  printify_order_id?: string | null;
  shipping?: number | null;
  tracking_number?: string | null;
  tracking_carrier?: string | null;
  tracking_url?: string | null;
  error_message?: string | null;
  job?: {
    id: string;
    state: string;
    mode: string;
    error_code?: string | null;
    error_message?: string | null;
    retry_classification?: string | null;
  } | null;
  items: CartConfigurationSnapshot[];
}

/**
 * Resolves the complete lifecycle state, artwork audit, economics audit,
 * blocking reasons, and operator queue tab for any order.
 */
export function resolveOrderLifecycle(
  order: RawOrderForLifecycle,
): OrderLifecycleAudit {
  const paymentStatus = order.payment_status || (order.status === 'paid' ? 'paid' : 'unpaid');
  const orderStatus = order.status || 'pending';
  const fulfillmentStatus = order.fulfillment_status || 'pending_payment';
  const jobState = order.job?.state ?? null;
  const printifyOrderId = order.printify_order_id ?? null;
  const trackingNumber = order.tracking_number ?? null;
  const trackingCarrier = order.tracking_carrier ?? null;
  const trackingUrl = order.tracking_url ?? null;

  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  // Run audits
  const artworkAudit = validateOrderArtwork(order.items);
  const shippingPaidCents = Math.round((order.shipping ?? 0) * 100);
  const economicsAudit = evaluateOrderEconomics(order.items, shippingPaidCents);

  if (!artworkAudit.valid) {
    blockingReasons.push(...artworkAudit.failures);
  }
  if (artworkAudit.hasWarnings) {
    warnings.push(...artworkAudit.warnings);
  }

  if (!economicsAudit.valid) {
    blockingReasons.push(...economicsAudit.blockingReasons);
  }

  if (order.error_message) {
    warnings.push(`ORDER_ERROR: ${order.error_message}`);
  }
  if (order.job?.error_message) {
    warnings.push(`JOB_ERROR: ${order.job.error_message}`);
  }

  // 1. Terminal / Exception States
  if (
    orderStatus === 'cancelled' ||
    fulfillmentStatus === 'cancelled' ||
    jobState === 'cancelled' ||
    fulfillmentStatus === 'refunded' ||
    jobState === 'refunded'
  ) {
    return {
      orderId: order.id,
      orderNumber: order.order_number || order.id.slice(0, 8),
      createdAt: order.created_at,
      paymentStatus,
      orderStatus,
      fulfillmentStatus,
      jobState,
      printifyOrderId,
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      operatorTab: 'EXCEPTION',
      canonicalLifecycleState: 'exception',
      canApprove: false,
      canDryRun: false,
      blockingReasons,
      warnings,
      artworkAudit,
      economicsAudit,
    };
  }

  // 2. Shipped / Completed States
  if (
    trackingNumber ||
    fulfillmentStatus === 'shipped' ||
    jobState === 'shipped' ||
    fulfillmentStatus === 'delivered' ||
    jobState === 'delivered'
  ) {
    const isDelivered =
      fulfillmentStatus === 'delivered' || jobState === 'delivered';
    return {
      orderId: order.id,
      orderNumber: order.order_number || order.id.slice(0, 8),
      createdAt: order.created_at,
      paymentStatus,
      orderStatus,
      fulfillmentStatus,
      jobState,
      printifyOrderId,
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      operatorTab: 'SHIPPED',
      canonicalLifecycleState: isDelivered ? 'completed' : 'shipped',
      canApprove: false,
      canDryRun: false,
      blockingReasons,
      warnings,
      artworkAudit,
      economicsAudit,
    };
  }

  // 3. In Production States
  if (fulfillmentStatus === 'in_production' || jobState === 'in_production') {
    return {
      orderId: order.id,
      orderNumber: order.order_number || order.id.slice(0, 8),
      createdAt: order.created_at,
      paymentStatus,
      orderStatus,
      fulfillmentStatus,
      jobState,
      printifyOrderId,
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      operatorTab: 'IN_PRODUCTION',
      canonicalLifecycleState: 'in_production',
      canApprove: false,
      canDryRun: false,
      blockingReasons,
      warnings,
      artworkAudit,
      economicsAudit,
    };
  }

  // 4. Submitted States (Printify order / draft created)
  if (
    printifyOrderId ||
    fulfillmentStatus === 'submitted' ||
    jobState === 'submitted' ||
    orderStatus === 'submitted_to_printify'
  ) {
    return {
      orderId: order.id,
      orderNumber: order.order_number || order.id.slice(0, 8),
      createdAt: order.created_at,
      paymentStatus,
      orderStatus,
      fulfillmentStatus,
      jobState,
      printifyOrderId,
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      operatorTab: 'SUBMITTED',
      canonicalLifecycleState: 'submitted',
      canApprove: false,
      canDryRun: false,
      blockingReasons,
      warnings,
      artworkAudit,
      economicsAudit,
    };
  }

  // 5. Unpaid / Checkout in progress
  if (paymentStatus !== 'paid') {
    return {
      orderId: order.id,
      orderNumber: order.order_number || order.id.slice(0, 8),
      createdAt: order.created_at,
      paymentStatus,
      orderStatus,
      fulfillmentStatus,
      jobState,
      printifyOrderId,
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      operatorTab: 'NEEDS_REVIEW',
      canonicalLifecycleState: 'checkout',
      canApprove: false,
      canDryRun: false,
      blockingReasons: ['UNPAID: Payment has not been completed by customer.'],
      warnings,
      artworkAudit,
      economicsAudit,
    };
  }

  // 6. Blocked States (Failed artwork check, failed margin floor, or explicit block)
  if (
    blockingReasons.length > 0 ||
    orderStatus === 'fulfillment_blocked' ||
    fulfillmentStatus === 'fulfillment_blocked'
  ) {
    return {
      orderId: order.id,
      orderNumber: order.order_number || order.id.slice(0, 8),
      createdAt: order.created_at,
      paymentStatus,
      orderStatus,
      fulfillmentStatus,
      jobState,
      printifyOrderId,
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      operatorTab: 'BLOCKED',
      canonicalLifecycleState: 'blocked',
      canApprove: false,
      canDryRun: true,
      blockingReasons,
      warnings,
      artworkAudit,
      economicsAudit,
    };
  }

  // 7. Needs Review (Job failed with uncertain status, or manual review requested)
  if (
    jobState === 'fulfillment_failed' ||
    order.job?.retry_classification === 'manual_review_uncertain_submission' ||
    orderStatus === 'needs_review' ||
    fulfillmentStatus === 'needs_review'
  ) {
    return {
      orderId: order.id,
      orderNumber: order.order_number || order.id.slice(0, 8),
      createdAt: order.created_at,
      paymentStatus,
      orderStatus,
      fulfillmentStatus,
      jobState,
      printifyOrderId,
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      operatorTab: 'NEEDS_REVIEW',
      canonicalLifecycleState: 'paid',
      canApprove: true,
      canDryRun: true,
      blockingReasons,
      warnings,
      artworkAudit,
      economicsAudit,
    };
  }

  // 8. Ready for Production (Artwork verified, economics verified, ready for operator)
  const isArtworkReady = artworkAudit.valid;
  const isFulfillmentReady = economicsAudit.valid && isArtworkReady;

  return {
    orderId: order.id,
    orderNumber: order.order_number || order.id.slice(0, 8),
    createdAt: order.created_at,
    paymentStatus,
    orderStatus,
    fulfillmentStatus,
    jobState,
    printifyOrderId,
    trackingNumber,
    trackingCarrier,
    trackingUrl,
    operatorTab: 'READY_FOR_PRODUCTION',
    canonicalLifecycleState: isFulfillmentReady
      ? 'fulfillment_ready'
      : isArtworkReady
        ? 'artwork_ready'
        : 'paid',
    canApprove: true,
    canDryRun: true,
    blockingReasons,
    warnings,
    artworkAudit,
    economicsAudit,
  };
}
