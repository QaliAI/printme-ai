import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envText = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const token = env.PRINTIFY_API_TOKEN;
const shopId = env.NEXT_PUBLIC_PRINTIFY_SHOP_ID || env.PRINTIFY_SHOP_ID;

async function run() {
  console.log('Testing Printify API capabilities with shopId:', shopId);

  // 1. Check Blueprint 12 (Everyday Tee - Bella+Canvas 3001)
  console.log('\n--- 1. Testing Blueprint 12 (Tee) ---');
  const bp12Res = await fetch(`https://api.printify.com/v1/catalog/blueprints/12.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const bp12 = await bp12Res.json();
  console.log('Blueprint 12:', bp12.title, bp12.brand, bp12.model);

  // Providers for BP 12
  const bp12ProvRes = await fetch(`https://api.printify.com/v1/catalog/blueprints/12/print_providers.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const bp12Providers = await bp12ProvRes.json();
  console.log('Providers for BP 12 count:', bp12Providers.length);
  const prov39 = bp12Providers.find(p => p.id === 39) || bp12Providers[0];
  console.log('Sample Provider:', prov39.id, prov39.title);

  // Shipping for BP 12 with provider 39
  const bp12ShipRes = await fetch(`https://api.printify.com/v1/catalog/blueprints/12/print_providers/${prov39.id}/shipping.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const bp12Ship = await bp12ShipRes.json();
  console.log('BP 12 Shipping profile sample:', JSON.stringify(bp12Ship.profiles?.[0]?.first_item), 'handling:', bp12Ship.handling_time);

  // 2. Check Blueprint 68 (Mug - 11oz)
  console.log('\n--- 2. Testing Blueprint 68 (Mug) ---');
  const bp68Res = await fetch(`https://api.printify.com/v1/catalog/blueprints/68.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const bp68 = await bp68Res.json();
  console.log('Blueprint 68:', bp68.title, bp68.brand, bp68.model);

  const bp68ProvRes = await fetch(`https://api.printify.com/v1/catalog/blueprints/68/print_providers.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const bp68Providers = await bp68ProvRes.json();
  const prov68 = bp68Providers.find(p => p.id === 99) || bp68Providers[0];
  console.log('Provider for BP 68:', prov68.id, prov68.title);

  const bp68ShipRes = await fetch(`https://api.printify.com/v1/catalog/blueprints/68/print_providers/${prov68.id}/shipping.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const bp68Ship = await bp68ShipRes.json();
  console.log('BP 68 Shipping profile sample:', JSON.stringify(bp68Ship.profiles?.[0]?.first_item));

  // 3. Check Blueprint 282/283 (Poster)
  console.log('\n--- 3. Testing Blueprint 282 (Poster) ---');
  const bp282Res = await fetch(`https://api.printify.com/v1/catalog/blueprints/282.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('BP 282 status:', bp282Res.status);
  if (bp282Res.ok) {
    const bp282 = await bp282Res.json();
    console.log('Blueprint 282:', bp282.title, bp282.brand, bp282.model);
  } else {
    const bp283Res = await fetch(`https://api.printify.com/v1/catalog/blueprints/283.json`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('BP 283 status:', bp283Res.status);
    if (bp283Res.ok) {
      const bp283 = await bp283Res.json();
      console.log('Blueprint 283:', bp283.title, bp283.brand, bp283.model);
    }
  }

  // 4. Test Printify Order creation schemas (Option A: line item with blueprint_id or Option B: product_id)
  console.log('\n--- 4. Testing Printify Order creation payload formats ---');
  const testOrderPayloadA = {
    external_id: `test-order-${Date.now()}`,
    label: 'PrintMe Test Order',
    line_items: [
      {
        print_provider_id: prov39.id,
        blueprint_id: 12,
        variant_id: 9576,
        print_areas: {
          front: [
            {
              src: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000',
              x: 0.5,
              y: 0.5,
              scale: 1,
              angle: 0
            }
          ]
        },
        quantity: 1
      }
    ],
    shipping_method: 1,
    send_shipping_notification: false,
    address_to: {
      first_name: 'Test',
      last_name: 'Shopper',
      email: 'test@printme.ai',
      phone: '555-123-4567',
      country: 'US',
      region: 'NY',
      address1: '123 Test St',
      city: 'New York',
      zip: '10001'
    }
  };

  // Try dry-run / shipping calculation first:
  console.log('Testing shipping calculation endpoint with payload A:');
  const shipCalcRes = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders/shipping.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testOrderPayloadA)
  });
  console.log('Shipping calc status:', shipCalcRes.status);
  const shipCalcData = await shipCalcRes.text();
  console.log('Shipping calc response:', shipCalcData);
}

run().catch(console.error);
