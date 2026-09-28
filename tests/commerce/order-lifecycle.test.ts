import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { curatedDesigns } from '@/lib/commerce/fixtures';
import { resolveOrderLifecycle } from '@/lib/commerce/fulfillment/order-lifecycle';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import {
  cartConfigurationSnapshotPayloadSchema,
  finalizeConfigurationSnapshot,
} from '@/lib/commerce/snapshot';
import { getPreviewTemplate } from '@/lib/commerce/templates';

function buildValidSnapshot() {
  const design = curatedDesigns[0];
  const product = getApprovedMerchProducts()[1]; // Everyday Tee
  const config = createProductConfiguration({
    designId: design.id,
    design: design.asset,
    product,
    template: getPreviewTemplate(product.previewTemplateId),
  });

  const snapshot = createCartSnapshot({
    id: '1f22af18-57b9-41f7-ab5e-a15bfb932728',
    design,
    product,
    configuration: config,
    createdAt: '2026-09-24T12:00:00.000Z',
  });

  const payload = cartConfigurationSnapshotPayloadSchema.parse(snapshot);
  return finalizeConfigurationSnapshot({
    ...payload,
    configuration: {
      ...payload.configuration,
      designAssetWidth: 4000,
      designAssetHeight: 5000,
      designAssetMimeType: 'image/png',
      designAssetHasTransparency: true,
      productionAssetUrl: 'https://assets.printme.ai/production/sample.png',
      unitPrice: 3400,
    },
  });
}

function buildBaseOrder(overrides?: Partial<Parameters<typeof resolveOrderLifecycle>[0]>) {
  return {
    id: '3f22af18-57b9-41f7-ab5e-a15bfb932728',
    order_number: 'PM-123456',
    created_at: '2026-09-24T14:00:00.000Z',
    status: 'paid',
    payment_status: 'paid',
    fulfillment_status: 'pending_payment',
    printify_order_id: null,
    tracking_number: null,
    tracking_carrier: null,
    items: [buildValidSnapshot()],
    ...overrides,
  };
}

describe('Authoritative Order State Machine & Operator Lifecycle', () => {
  it('classifies a valid, paid order as READY_FOR_PRODUCTION with canApprove=true', () => {
    const order = buildBaseOrder();
    const audit = resolveOrderLifecycle(order);

    expect(audit.operatorTab).toBe('READY_FOR_PRODUCTION');
    expect(audit.canApprove).toBe(true);
    expect(audit.canDryRun).toBe(true);
    expect(audit.blockingReasons).toHaveLength(0);
    expect(audit.canonicalLifecycleState).toBe('fulfillment_ready');
  });

  it('classifies an order with low-res artwork as BLOCKED with explicit blocking reason', () => {
    const validSnapshot = buildValidSnapshot();
    const lowResSnapshot = {
      ...validSnapshot,
      configuration: {
        ...validSnapshot.configuration,
        designAssetWidth: 600,
        designAssetHeight: 800, // < 150 DPI
      },
    };

    const order = buildBaseOrder({ items: [lowResSnapshot] });
    const audit = resolveOrderLifecycle(order);

    expect(audit.operatorTab).toBe('BLOCKED');
    expect(audit.canApprove).toBe(false);
    expect(
      audit.blockingReasons.some((r) => r.includes('ARTWORK_RESOLUTION_TOO_LOW')),
    ).toBe(true);
  });

  it('classifies an order with below-floor profit as BLOCKED', () => {
    const validSnapshot = buildValidSnapshot();
    const cheapSnapshot = {
      ...validSnapshot,
      configuration: {
        ...validSnapshot.configuration,
        unitPrice: 1200, // $12.00 on a $9.20 cost shirt -> < $8.00 floor
      },
    };

    const order = buildBaseOrder({ items: [cheapSnapshot] });
    const audit = resolveOrderLifecycle(order);

    expect(audit.operatorTab).toBe('BLOCKED');
    expect(audit.canApprove).toBe(false);
    expect(
      audit.blockingReasons.some((r) => r.includes('MARGIN_BELOW_PROFIT_FLOOR')),
    ).toBe(true);
  });

  it('classifies an order with printify_order_id as SUBMITTED', () => {
    const order = buildBaseOrder({
      printify_order_id: 'printify-order-7890',
      fulfillment_status: 'submitted',
    });
    const audit = resolveOrderLifecycle(order);

    expect(audit.operatorTab).toBe('SUBMITTED');
    expect(audit.canonicalLifecycleState).toBe('submitted');
    expect(audit.canApprove).toBe(false);
  });

  it('classifies an order with tracking number as SHIPPED', () => {
    const order = buildBaseOrder({
      printify_order_id: 'printify-order-7890',
      tracking_number: '9400111899223190001122',
      tracking_carrier: 'USPS',
      fulfillment_status: 'shipped',
    });
    const audit = resolveOrderLifecycle(order);

    expect(audit.operatorTab).toBe('SHIPPED');
    expect(audit.canonicalLifecycleState).toBe('shipped');
    expect(audit.canApprove).toBe(false);
  });

  it('classifies a cancelled or refunded order as EXCEPTION', () => {
    const order = buildBaseOrder({
      status: 'cancelled',
      fulfillment_status: 'cancelled',
    });
    const audit = resolveOrderLifecycle(order);

    expect(audit.operatorTab).toBe('EXCEPTION');
    expect(audit.canonicalLifecycleState).toBe('exception');
    expect(audit.canApprove).toBe(false);
  });

  it('classifies a job with manual_review_uncertain_submission as NEEDS_REVIEW', () => {
    const order = buildBaseOrder({
      fulfillment_status: 'needs_review',
      job: {
        id: 'job-123',
        state: 'fulfillment_failed',
        mode: 'live',
        retry_classification: 'manual_review_uncertain_submission',
        error_message: 'Printify network timeout during submission.',
      },
    });
    const audit = resolveOrderLifecycle(order);

    expect(audit.operatorTab).toBe('NEEDS_REVIEW');
    expect(audit.canApprove).toBe(true);
  });
});
