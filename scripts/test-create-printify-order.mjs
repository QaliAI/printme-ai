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
  console.log('Testing with Approved Catalog combinations (Provider 99 - Printify Choice)...');

  // Step 1: Upload artwork
  console.log('1. Uploading test artwork...');
  const uploadRes = await fetch('https://api.printify.com/v1/uploads/images.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      file_name: 'test-fall-art.png',
      url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1000'
    })
  });
  const uploadData = await uploadRes.json();
  console.log('Upload image ID:', uploadData.id);

  // Step 2: Try creating order directly with provider 99, blueprint 12, variant 18541
  console.log('\n2. Testing direct order creation with blueprint 12, provider 99, variant 18541...');
  const directOrderRes = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: `test-order-${Date.now()}`,
      label: 'PrintMe Direct Order Test',
      line_items: [
        {
          print_provider_id: 99,
          blueprint_id: 12,
          variant_id: 18541,
          print_areas: {
            front: [
              {
                src: uploadData.preview_url,
                x: 0.5,
                y: 0.5,
                scale: 0.82,
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
        last_name: 'Customer',
        email: 'test@printme.ai',
        phone: '555-123-4567',
        country: 'US',
        region: 'NY',
        address1: '123 Main St',
        city: 'New York',
        zip: '10001'
      }
    })
  });

  console.log('Direct order creation status:', directOrderRes.status);
  const directOrderData = await directOrderRes.json();
  console.log('Direct order result:', JSON.stringify(directOrderData, null, 2));

  // If direct order fails, test creating a product with provider 99 first
  if (!directOrderRes.ok) {
    console.log('\n3. Testing Product Creation with Provider 99...');
    const productRes = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'PrintMe Everyday Tee Test',
        description: 'Test product for PrintMe Fall 2026',
        blueprint_id: 12,
        print_provider_id: 99,
        variants: [
          {
            id: 18541,
            price: 3400,
            is_enabled: true
          }
        ],
        print_areas: [
          {
            variant_ids: [18541],
            placeholders: [
              {
                position: 'front',
                images: [
                  {
                    id: uploadData.id,
                    x: 0.5,
                    y: 0.5,
                    scale: 0.82,
                    angle: 0
                  }
                ]
              }
            ]
          }
        ]
      })
    });
    console.log('Product creation status:', productRes.status);
    const productData = await productRes.json();
    console.log('Product creation response:', JSON.stringify(productData, null, 2));
  }
}

main().catch(console.error);
