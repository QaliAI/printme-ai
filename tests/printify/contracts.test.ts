import { describe, expect, it } from 'vitest';
import blueprints from '../fixtures/printify/blueprints.json';
import order from '../fixtures/printify/order.json';
import product from '../fixtures/printify/product.json';
import providers from '../fixtures/printify/providers.json';
import shipping from '../fixtures/printify/shipping.json';
import shops from '../fixtures/printify/shops.json';
import upload from '../fixtures/printify/upload.json';
import variants from '../fixtures/printify/variants.json';
import {
  printifyBlueprintSchema,
  printifyOrderSchema,
  printifyProductSchema,
  printifyProviderSchema,
  printifyProviderVariantsSchema,
  printifyShippingSchema,
  printifyShopSchema,
  printifyUploadedImageSchema,
} from '@/lib/printify/client';

describe('Printify response contracts', () => {
  it('validates the shops fixture', () => {
    expect(() => printifyShopSchema.array().parse(shops)).not.toThrow();
  });

  it('validates blueprint and provider fixtures', () => {
    expect(() => printifyBlueprintSchema.array().parse(blueprints)).not.toThrow();
    expect(() => printifyProviderSchema.array().parse(providers)).not.toThrow();
  });

  it('validates provider-specific variants and printable placeholders', () => {
    const parsed = printifyProviderVariantsSchema.parse(variants);
    expect(parsed.variants[0].placeholders[0]).toMatchObject({
      position: 'front',
      decoration_method: 'dtg',
      width: 4500,
      height: 5700,
    });
  });

  it('validates shipping, upload, product mockup, and order fixtures', () => {
    expect(() => printifyShippingSchema.parse(shipping)).not.toThrow();
    expect(() => printifyUploadedImageSchema.parse(upload)).not.toThrow();
    expect(printifyProductSchema.parse(product).images[0].is_default).toBe(true);
    expect(printifyOrderSchema.parse(order).id).toBe('order-fixture-1');
  });
});
