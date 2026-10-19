import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/printify/mockups/route';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
const client = vi.hoisted(() => ({
  uploadImage: vi.fn(),
  createProduct: vi.fn(),
  deleteProduct: vi.fn(),
  listPrintProviders: vi.fn()
}));
vi.mock('@/lib/printify/client', () => ({
  getPrintifyClient: () => client
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('PRINTIFY_SHOP_ID', 'test-shop');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  vi.stubEnv('PRINTIFY_AUTO_CLEANUP', 'false');
  client.uploadImage.mockResolvedValue({
    id: 'test-artwork'
  });
  client.createProduct.mockResolvedValue({
    id: 'test-product',
    images: [{
      src: 'https://images.printify.com/rendered-test',
      position: 'front',
      is_default: true
    }]
  });
});
afterEach(() => vi.unstubAllEnvs());
describe('approved official mockup mapping', () => {
  it('rejects unavailable products before any provider writes', async () => {
    const response = await POST(new NextRequest('https://printme.ai/api/printify/mockups', {
      method: 'POST',
      body: JSON.stringify({
        imageUrl: 'https://art.example/design.png',
        blueprintIds: [937]
      })
    }));
    expect(response.status).toBe(400);
    expect(client.uploadImage).not.toHaveBeenCalled();
    expect(client.createProduct).not.toHaveBeenCalled();
  });
  it('renders the approved provider/variant/price and canonical default placement', async () => {
    const response = await POST(new NextRequest('https://printme.ai/api/printify/mockups', {
      method: 'POST',
      body: JSON.stringify({
        imageUrl: 'https://art.example/design.png'
      })
    }));
    expect(response.status).toBe(200);
    const products = getApprovedMerchProducts();
    expect(client.createProduct).toHaveBeenCalledTimes(products.length);
    for (const product of products) {
      const variant = product.variants.find(candidate => candidate.available)!;
      const payload = client.createProduct.mock.calls.find(([payload]) => payload.blueprint_id === product.printifyBlueprintId)![0];
      expect(payload.print_provider_id).toBe(product.provider.printifyProviderId);
      expect(payload.variants).toEqual([{
        id: variant.printifyVariantId,
        price: variant.unitPrice,
        is_enabled: true
      }]);
      expect(payload.print_areas[0].placeholders[0].images[0]).toMatchObject({
        x: product.defaultPlacement.normalizedX,
        y: product.defaultPlacement.normalizedY,
        scale: product.defaultPlacement.normalizedScale,
        angle: product.defaultPlacement.angle
      });
    }
    expect(client.listPrintProviders).not.toHaveBeenCalled();
    expect((await response.json()).mockups).toHaveLength(products.length);
  });
});
