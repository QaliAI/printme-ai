import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { curatedDesigns } from '@/lib/commerce/fixtures';
import {
  buildPrintifyFulfillmentPayload,
  type FulfillmentOrder,
} from '@/lib/commerce/fulfillment/payload';
import {
  classifyFulfillmentFailure,
  PrintifyFulfillmentService,
  type FulfillmentJob,
  type FulfillmentStore,
} from '@/lib/commerce/fulfillment/service';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import {
  cartConfigurationSnapshotPayloadSchema,
  finalizeConfigurationSnapshot,
} from '@/lib/commerce/snapshot';
import { getPreviewTemplate } from '@/lib/commerce/templates';

const originalMode = process.env.PRINTIFY_FULFILLMENT_MODE;

function orderSnapshot() {
  const design = curatedDesigns[0];
  const product = getApprovedMerchProducts()[1];
  const original = createCartSnapshot({
    id: '1f22af18-57b9-41f7-ab5e-a15bfb932728',
    design,
    product,
    configuration: createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    }),
    createdAt: '2026-07-29T12:00:00.000Z',
  });
  const payload = cartConfigurationSnapshotPayloadSchema.parse(original);
  return finalizeConfigurationSnapshot({
    ...payload,
    configuration: {
      ...payload.configuration,
      productionAssetUrl: 'https://assets.example.test/production/design.png',
    },
  });
}

function paidOrder(): FulfillmentOrder {
  return {
    id: '2f22af18-57b9-41f7-ab5e-a15bfb932728',
    paymentStatus: 'paid',
    customerEmail: 'shopper@example.com',
    shippingAddress: {
      name: 'Test Shopper',
      line1: '1 Test Way',
      line2: null,
      city: 'Chicago',
      state: 'IL',
      postal_code: '60601',
      country: 'US',
      phone: '',
    },
    items: [orderSnapshot()],
    printifyOrderId: null,
    productionSubmittedAt: null,
  };
}

class MemoryFulfillmentStore implements FulfillmentStore {
  order: FulfillmentOrder | null = paidOrder();
  job: FulfillmentJob = {
    id: '3f22af18-57b9-41f7-ab5e-a15bfb932728',
    orderId: '2f22af18-57b9-41f7-ab5e-a15bfb932728',
    state: 'paid',
    mode: 'disabled',
    printifyOrderId: null,
    productionSubmittedAt: null,
  };
  lockCount = 0;
  dryRunCount = 0;
  redactedPayload: unknown;
  failureCode: string | null = null;

  async loadPaidOrder() {
    return structuredClone(this.order);
  }

  async findJob() {
    return structuredClone(this.job);
  }

  async lockJob(
    input: Parameters<FulfillmentStore['lockJob']>[0],
  ) {
    this.lockCount += 1;
    const alreadyComplete = [
      'dry_run_complete',
      'submitted',
      'in_production',
      'shipped',
      'delivered',
    ].includes(this.job.state);
    if (!alreadyComplete) {
      this.job.state = 'preparing_fulfillment';
      this.job.mode = input.mode;
    }
    return { job: structuredClone(this.job), alreadyComplete };
  }

  async completeDryRun(
    input: Parameters<FulfillmentStore['completeDryRun']>[0],
  ) {
    this.dryRunCount += 1;
    this.redactedPayload = input.redactedPayload;
    this.job.state = 'dry_run_complete';
    this.job.mode = 'dry-run';
  }

  async markReady() {
    this.job.state = 'fulfillment_ready';
    this.job.mode = 'live';
  }

  async markFailed(
    input: Parameters<FulfillmentStore['markFailed']>[0],
  ) {
    this.failureCode = input.errorCode;
    this.job.state = 'fulfillment_failed';
  }

  async markSubmitting() {
    this.job.state = 'fulfillment_submitting';
  }

  async markSubmitted() {
    this.job.state = 'submitted';
    this.job.productionSubmittedAt = new Date().toISOString();
  }
}

beforeEach(() => {
  process.env.PRINTIFY_FULFILLMENT_MODE = 'dry-run';
});

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.PRINTIFY_FULFILLMENT_MODE;
  } else {
    process.env.PRINTIFY_FULFILLMENT_MODE = originalMode;
  }
});

describe('idempotent Printify fulfillment', () => {
  it('requires a paid order and rejects disabled mode', async () => {
    const missing = new MemoryFulfillmentStore();
    missing.order = null;
    await expect(
      new PrintifyFulfillmentService(missing).prepare(missing.job.orderId),
    ).rejects.toMatchObject({ code: 'PAID_ORDER_REQUIRED' });

    process.env.PRINTIFY_FULFILLMENT_MODE = 'disabled';
    const disabled = new MemoryFulfillmentStore();
    await expect(
      new PrintifyFulfillmentService(disabled).prepare(disabled.job.orderId),
    ).rejects.toMatchObject({ code: 'FULFILLMENT_DISABLED' });
    expect(disabled.lockCount).toBe(0);
  });

  it('builds and stores a redacted dry-run without a Printify write', async () => {
    const store = new MemoryFulfillmentStore();
    const gateway = {
      sendOrderToProduction: vi.fn(async () => undefined),
    };
    const result = await new PrintifyFulfillmentService(
      store,
      gateway,
      undefined,
      () => 'worker-test',
    ).prepare(store.job.orderId);

    expect(result.state).toBe('dry_run_complete');
    expect(store.dryRunCount).toBe(1);
    expect(gateway.sendOrderToProduction).not.toHaveBeenCalled();
    expect(JSON.stringify(store.redactedPayload)).not.toContain(
      'shopper@example.com',
    );
    expect(JSON.stringify(store.redactedPayload)).not.toContain('1 Test Way');
  });

  it('creates a Printify draft order without sending to production', async () => {
    process.env.PRINTIFY_FULFILLMENT_MODE = 'draft';
    const store = new MemoryFulfillmentStore();
    const draftGateway = {
      createDraftOrder: vi.fn(async () => ({
        printifyProductId: 'printify-prod-123',
        printifyOrderId: 'printify-draft-order-456',
      })),
    };
    const productionGateway = {
      sendOrderToProduction: vi.fn(async () => undefined),
    };

    const service = new PrintifyFulfillmentService(
      store,
      productionGateway,
      draftGateway,
    );
    const result = await service.prepare(store.job.orderId);

    expect(result.state).toBe('manual_review_ready');
    expect(result.printifyOrderId).toBe('printify-draft-order-456');
    expect(draftGateway.createDraftOrder).toHaveBeenCalledTimes(1);
    expect(productionGateway.sendOrderToProduction).not.toHaveBeenCalled();
  });

  it('deduplicates completed jobs', async () => {
    const store = new MemoryFulfillmentStore();
    const service = new PrintifyFulfillmentService(store);

    await service.prepare(store.job.orderId);
    await service.prepare(store.job.orderId);

    expect(store.dryRunCount).toBe(1);
  });

  it('validates complete addresses, approved placements, and artwork', () => {
    const incomplete = paidOrder();
    incomplete.shippingAddress.line1 = '';
    expect(() => buildPrintifyFulfillmentPayload(incomplete)).toThrow(
      /INVALID_ORDER_DATA/,
    );

    const invalidPlacement = paidOrder();
    const placementPayload = cartConfigurationSnapshotPayloadSchema.parse(
      invalidPlacement.items[0],
    );
    invalidPlacement.items = [
      finalizeConfigurationSnapshot({
        ...placementPayload,
        configuration: {
          ...placementPayload.configuration,
          printPosition: 'all-over',
        },
      }),
    ];
    expect(() =>
      buildPrintifyFulfillmentPayload(invalidPlacement),
    ).toThrow(/INVALID_PLACEMENT/);

    const missingArtwork = paidOrder();
    const artworkPayload = cartConfigurationSnapshotPayloadSchema.parse(
      missingArtwork.items[0],
    );
    missingArtwork.items = [
      finalizeConfigurationSnapshot({
        ...artworkPayload,
        configuration: {
          ...artworkPayload.configuration,
          productionAssetUrl: '/local-only.png',
        },
      }),
    ];
    expect(() => buildPrintifyFulfillmentPayload(missingArtwork)).toThrow(
      /MISSING_PRODUCTION_ARTWORK/,
    );
  });

  it('classifies validation, pre-submit, and uncertain failures safely', () => {
    const invalid = paidOrder();
    invalid.shippingAddress.line1 = '';
    try {
      buildPrintifyFulfillmentPayload(invalid);
    } catch (error) {
      expect(classifyFulfillmentFailure(error)).toBe('not_retryable');
    }
    expect(classifyFulfillmentFailure(new Error('provider unavailable'))).toBe(
      'retryable_before_submission',
    );
    expect(classifyFulfillmentFailure(new Error('network timeout'))).toBe(
      'manual_review_uncertain_submission',
    );
  });

  it('guards production submission against missing IDs and duplicates', async () => {
    process.env.PRINTIFY_FULFILLMENT_MODE = 'live';
    const store = new MemoryFulfillmentStore();
    store.job.state = 'fulfillment_ready';
    const gateway = {
      sendOrderToProduction: vi.fn(async () => undefined),
    };
    const service = new PrintifyFulfillmentService(store, gateway);

    await expect(
      service.submitExistingOrderToProduction(store.job.orderId),
    ).rejects.toMatchObject({ code: 'PRINTIFY_ORDER_ID_REQUIRED' });

    store.order!.printifyOrderId = 'printify-order-existing';
    store.order!.productionSubmittedAt = new Date().toISOString();
    await expect(
      service.submitExistingOrderToProduction(store.job.orderId),
    ).rejects.toMatchObject({ code: 'DUPLICATE_PRODUCTION_SUBMISSION' });
    expect(gateway.sendOrderToProduction).not.toHaveBeenCalled();
  });

  it('classifies uncertain production responses for manual review', async () => {
    process.env.PRINTIFY_FULFILLMENT_MODE = 'live';
    const store = new MemoryFulfillmentStore();
    store.job.state = 'fulfillment_ready';
    store.order!.printifyOrderId = 'printify-order-existing';
    const service = new PrintifyFulfillmentService(store, {
      sendOrderToProduction: vi.fn(async () => {
        throw new Error('network timeout after request');
      }),
    });

    await expect(
      service.submitExistingOrderToProduction(store.job.orderId),
    ).rejects.toThrow(/network timeout/i);
    expect(store.failureCode).toBe('PRODUCTION_SUBMISSION_UNCERTAIN');
    expect(store.job.state).toBe('fulfillment_failed');
  });
});
