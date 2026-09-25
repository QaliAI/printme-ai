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

async function main() {
  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: `test-mug-721-${Date.now()}`,
      label: 'PrintMe Mug 721 Test',
      line_items: [
        {
          print_provider_id: 99,
          blueprint_id: 68,
          variant_id: 721,
          print_areas: {
            front: [
              {
                src: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000',
                x: 0.5,
                y: 0.5,
                scale: 0.8,
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
        phone: '5551234567',
        country: 'US',
        region: 'NY',
        address1: '123 Main St',
        city: 'New York',
        zip: '10001'
      }
    })
  });
  console.log('Status with 99 / 721:', res.status);
  console.log('Response:', await res.text());
}

main().catch(console.error);
