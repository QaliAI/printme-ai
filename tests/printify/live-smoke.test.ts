import { describe, expect, it } from 'vitest';
import { getPrintifyClient } from '@/lib/printify/client';

const liveEnabled = process.env.PRINTIFY_LIVE_SMOKE_TEST === 'true';
const liveDescribe = liveEnabled ? describe : describe.skip;

liveDescribe('Printify read-only live smoke', () => {
  it('lists shops and validates the configured shop without mutating data', async () => {
    if (!process.env.PRINTIFY_API_TOKEN || !process.env.PRINTIFY_SHOP_ID) {
      throw new Error(
        'PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID are required when PRINTIFY_LIVE_SMOKE_TEST=true.'
      );
    }

    const client = getPrintifyClient();
    const shops = await client.listShops();
    const configuredShop = await client.validateConfiguredShop();

    expect(shops.length).toBeGreaterThan(0);
    expect(String(configuredShop.id)).toBe(process.env.PRINTIFY_SHOP_ID);
  });
});
