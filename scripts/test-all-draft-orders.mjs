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
const shopId = '22066512';

async function createDraftOrder(label, lineItems) {
  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: `test-draft-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      label,
      line_items: lineItems,
      shipping_method: 1,
      send_shipping_notification: false,
      address_to: {
        first_name: 'Test',
        last_name: 'Customer',
        email: 'test@printme.ai',
        phone: '5551234567',
        country: 'US',
        region: 'NY',
        address1: '123 Main St',
        city: 'New York',
        zip: '10001'
      }
    })
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Failed ${label}:`, JSON.stringify(data));
    return null;
  }
  return data;
}

async function getOrder(orderId) {
  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders/${orderId}.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

async function main() {
  const testArtUrl = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000';

  // 1. Keepsake Mug (BP 68, Provider 1, Variant 33719)
  console.log('\n--- Testing Mug Draft Order ---');
  const mugOrder = await createDraftOrder('PrintMe Mug Test', [
    {
      print_provider_id: 1,
      blueprint_id: 68,
      variant_id: 33719,
      print_areas: {
        front: [
          {
            src: testArtUrl,
            x: 0.5,
            y: 0.5,
            scale: 0.8,
            angle: 0
          }
        ]
      },
      quantity: 1
    }
  ]);
  if (mugOrder) {
    const details = await getOrder(mugOrder.id);
    console.log('Mug Draft Order ID:', details.id);
    console.log('Mug Status:', details.status);
    console.log('Mug Item Cost:', details.line_items[0].cost);
    console.log('Mug Item Shipping:', details.line_items[0].shipping_cost);
    console.log('Mug Total Price:', details.total_price);
    console.log('Mug Total Shipping:', details.total_shipping);
  }

  // 2. Gallery Poster (BP 282, Provider 99, Variant 43138 for 12x18 and 43144 for 18x24)
  console.log('\n--- Testing Poster 18x24 Draft Order ---');
  const posterOrder = await createDraftOrder('PrintMe Poster Test', [
    {
      print_provider_id: 99,
      blueprint_id: 282,
      variant_id: 43144,
      print_areas: {
        front: [
          {
            src: testArtUrl,
            x: 0.5,
            y: 0.5,
            scale: 1,
            angle: 0
          }
        ]
      },
      quantity: 1
    }
  ]);
  if (posterOrder) {
    const details = await getOrder(posterOrder.id);
    console.log('Poster Draft Order ID:', details.id);
    console.log('Poster Status:', details.status);
    console.log('Poster Item Cost:', details.line_items[0].cost);
    console.log('Poster Item Shipping:', details.line_items[0].shipping_cost);
    console.log('Poster Total Price:', details.total_price);
    console.log('Poster Total Shipping:', details.total_shipping);
  }
}

main().catch(console.error);
