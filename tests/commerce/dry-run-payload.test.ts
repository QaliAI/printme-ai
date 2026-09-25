import { describe, expect, it } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { curatedDesigns } from '@/lib/commerce/fixtures';
import {
  buildPrintifyFulfillmentPayload,
  hashFulfillmentPayload,
  redactFulfillmentPayload,
  type FulfillmentOrder,
} from '@/lib/commerce/fulfillment/payload';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import {
  cartConfigurationSnapshotPayloadSchema,
  finalizeConfigurationSnapshot,
} from '@/lib/commerce/snapshot';
import { getPreviewTemplate } from '@/lib/commerce/templates';

function buildMockOrder(): FulfillmentOrder {
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
  const finalized = finalizeConfigurationSnapshot({
    ...payload,
    configuration: {
      ...payload.configuration,
      productionAssetUrl: 'https://assets.printme.ai/production/sample-tee.png',
    },
  });

  return {
    id: '2f22af18-57b9-41f7-ab5e-a15bfb932728',
    paymentStatus: 'paid',
    customerEmail: 'alex.shopper@example.com',
    shippingAddress: {
      name: 'Alex Shopper',
      line1: '123 Market Street',
      line2: 'Apt 4B',
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94105',
      country: 'US',
      phone: '+14155550199',
    },
    items: [finalized],
    printifyOrderId: null,
    productionSubmittedAt: null,
  };
}

describe('Printify Dry-Run Payload Synthesis', () => {
  it('synthesizes exact Printify fulfillment JSON payload with verified providers and assets', () => {
    const order = buildMockOrder();
    const payload = buildPrintifyFulfillmentPayload(order);

    expect(payload.external_id).toBe(order.id);
    expect(payload.label).toBe(`PrintMe ${order.id.slice(0, 8)}`);
    expect(payload.send_shipping_notification).toBe(false);
    expect(payload.shipping_method).toBe(1);

    // Recipient address
    expect(payload.address_to.first_name).toBe('Alex');
    expect(payload.address_to.last_name).toBe('Shopper');
    expect(payload.address_to.email).toBe('alex.shopper@example.com');
    expect(payload.address_to.address1).toBe('123 Market Street');
    expect(payload.address_to.address2).toBe('Apt 4B');
    expect(payload.address_to.city).toBe('San Francisco');
    expect(payload.address_to.region).toBe('CA');
    expect(payload.address_to.zip).toBe('94105');
    expect(payload.address_to.country).toBe('US');

    // Line items
    expect(payload.line_items).toHaveLength(1);
    const lineItem = payload.line_items[0];
    expect(lineItem.print_provider_id).toBe(99);
    expect(lineItem.blueprint_id).toBe(12);
    expect(lineItem.variant_id).toBe(18541);
    expect(lineItem.print_areas.front).toBeDefined();
    expect(lineItem.print_areas.front[0].src).toBe(
      'https://assets.printme.ai/production/sample-tee.png',
    );
    expect(lineItem.quantity).toBe(1);
  });

  it('generates a valid, deterministic SHA-256 hash for payload auditability', () => {
    const order = buildMockOrder();
    const payload = buildPrintifyFulfillmentPayload(order);
    const hash1 = hashFulfillmentPayload(payload);
    const hash2 = hashFulfillmentPayload(payload);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('redacts customer PII while preserving fulfillment metadata for safe logging', () => {
    const order = buildMockOrder();
    const payload = buildPrintifyFulfillmentPayload(order);
    const redacted = redactFulfillmentPayload(payload);

    expect(redacted.address_to.first_name).toBe('[redacted]');
    expect(redacted.address_to.last_name).toBe('[redacted]');
    expect(redacted.address_to.email).toBe('[redacted]');
    expect(redacted.address_to.address1).toBe('[redacted]');
    expect(redacted.address_to.country).toBe('US');
    expect(redacted.address_to.region).toBe('CA');
    expect(redacted.line_items).toEqual(payload.line_items);
  });
});
