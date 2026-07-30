import { describe, expect, it, vi } from 'vitest';
import blueprints from '../fixtures/printify/blueprints.json';
import order from '../fixtures/printify/order.json';
import product from '../fixtures/printify/product.json';
import providers from '../fixtures/printify/providers.json';
import shipping from '../fixtures/printify/shipping.json';
import shops from '../fixtures/printify/shops.json';
import upload from '../fixtures/printify/upload.json';
import variants from '../fixtures/printify/variants.json';
import {
  PrintifyClient,
  type PrintifyCreateOrderInput,
  type PrintifyCreateProductInput,
} from '@/lib/printify/client';

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers });
}

const createProductInput: PrintifyCreateProductInput = {
  title: 'Fixture Product',
  description: 'Fixture product description',
  blueprint_id: 12,
  print_provider_id: 39,
  variants: [{ id: 9576, price: 3400, is_enabled: true }],
  print_areas: [
    {
      variant_ids: [9576],
      placeholders: [
        {
          position: 'front',
          decoration_method: 'dtg',
          images: [
            {
              id: 'upload-fixture-1',
              x: 0.5,
              y: 0.5,
              scale: 1,
              angle: 0,
            },
          ],
        },
      ],
    },
  ],
};

const createOrderInput: PrintifyCreateOrderInput = {
  external_id: 'checkout-fixture-1',
  line_items: [
    {
      product_id: 'product-fixture-1',
      variant_id: 9576,
      quantity: 1,
    },
  ],
  shipping_method: 1,
  send_shipping_notification: false,
  address_to: {
    first_name: 'Fixture',
    last_name: 'Shopper',
    email: 'fixture@example.com',
    phone: '',
    country: 'US',
    region: 'IL',
    address1: '1 Test Way',
    address2: '',
    city: 'Chicago',
    zip: '60601',
  },
};

describe('PrintifyClient documented transport', () => {
  it('uses exact paths, the required user agent, and validated responses', async () => {
    const responses = [
      shops,
      blueprints,
      blueprints[0],
      providers,
      variants,
      shipping,
      upload,
      product,
      product,
      product,
      order,
      {},
    ];
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse(responses.shift())
    );
    const client = new PrintifyClient({
      apiToken: 'test-token',
      shopId: '12345',
      apiBaseUrl: 'https://printify.test/v1',
      userAgent: 'PrintMe.contract-test/1.0',
      fetchImpl,
      sleep: async () => undefined,
    });

    await client.validateConfiguredShop();
    await client.listBlueprints();
    await client.getBlueprint(12);
    await client.listPrintProviders(12);
    await client.getProviderVariants(12, 39);
    await client.getShippingInformation(12, 39);
    await client.uploadImage({
      fileName: 'fixture.png',
      url: 'https://example.com/fixture.png',
    });
    await client.createProduct(createProductInput);
    await client.getProduct('product-fixture-1');
    await client.getProductMockupImages('product-fixture-1');
    await client.createOrder(createOrderInput);
    await client.sendOrderToProduction('order-fixture-1');

    const paths = fetchImpl.mock.calls.map(([url]) =>
      String(url).replace('https://printify.test/v1', '')
    );
    expect(paths).toEqual([
      '/shops.json',
      '/catalog/blueprints.json',
      '/catalog/blueprints/12.json',
      '/catalog/blueprints/12/print_providers.json',
      '/catalog/blueprints/12/print_providers/39/variants.json',
      '/catalog/blueprints/12/print_providers/39/shipping.json',
      '/uploads/images.json',
      '/shops/12345/products.json',
      '/shops/12345/products/product-fixture-1.json',
      '/shops/12345/products/product-fixture-1.json',
      '/shops/12345/orders.json',
      '/shops/12345/orders/order-fixture-1/send_to_production.json',
    ]);

    for (const [, init] of fetchImpl.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get('user-agent')).toBe('PrintMe.contract-test/1.0');
      expect(headers.get('authorization')).toBe('Bearer test-token');
    }
  });

  it('honors 429 retry-after for safe GET requests', async () => {
    const sleep = vi.fn(async () => undefined);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          { code: 429, message: 'Rate limited' },
          429,
          { 'retry-after': '1' }
        )
      )
      .mockResolvedValueOnce(jsonResponse(shops));
    const client = new PrintifyClient({
      apiToken: 'test-token',
      shopId: '12345',
      fetchImpl,
      sleep,
      maxGetRetries: 2,
    });

    await expect(client.listShops()).resolves.toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it('does not retry non-idempotent product creation', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ code: 429, message: 'Rate limited' }, 429)
    );
    const client = new PrintifyClient({
      apiToken: 'test-token',
      shopId: '12345',
      fetchImpl,
      maxGetRetries: 2,
    });

    await expect(client.createProduct(createProductInput)).rejects.toMatchObject({
      status: 429,
      code: '429',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns a structured contract error for malformed upstream data', async () => {
    const client = new PrintifyClient({
      apiToken: 'test-token',
      fetchImpl: vi.fn<typeof fetch>(async () =>
        jsonResponse([{ title: 'Missing ID' }])
      ),
    });

    await expect(client.listShops()).rejects.toMatchObject({
      name: 'PrintifyApiError',
      code: 'RESPONSE_VALIDATION_FAILED',
      status: 502,
    });
  });
});
