import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

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

// Check test key
let testKey = env.STRIPE_SECRET_KEY;
if (!testKey || !testKey.startsWith('sk_test_')) {
  // Check downloads/mercury codes
  try {
    const codes = readFileSync('C:\\Users\\omino\\Downloads\\mercury codes.txt', 'utf-8');
    const match = codes.match(/sk_test_[A-Za-z0-9]+/);
    if (match) testKey = match[0];
  } catch {}
}

console.log('Testing Stripe Checkout with test key prefix:', testKey?.slice(0, 12));

const stripe = new Stripe(testKey);

async function main() {
  console.log('\n--- Creating Stripe Checkout Session with Hero Products ---');
  // 3 Hero Products:
  // Everyday Tee: $34 (3400 cents)
  // Keepsake Mug: $19 (1900 cents)
  // Gallery Poster: $29 (2900 cents)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: 'order_test_fall_2026_001',
    customer_email: 'shopper@printme.ai',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 3400, // $34 Everyday Tee
          product_data: {
            name: 'Boo Crew — Everyday Tee',
            description: 'Size M / White (Bella+Canvas 3001)',
            metadata: {
              merch_product_id: 'everyday-tee',
              blueprint_id: '12',
              provider_id: '99',
              variant_id: '18541',
              design_slug: 'boo-crew'
            }
          }
        }
      },
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 1900, // $19 Keepsake Mug
          product_data: {
            name: 'Here for the Boos — Keepsake Mug',
            description: '11 oz Glossy Ceramic Mug',
            metadata: {
              merch_product_id: 'keepsake-mug',
              blueprint_id: '68',
              provider_id: '1',
              variant_id: '33719',
              design_slug: 'here-for-the-boos'
            }
          }
        }
      },
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 2900, // $29 Gallery Poster (12x18)
          product_data: {
            name: 'Little Pumpkin — Gallery Poster',
            description: '12 × 18 in Archival Matte Paper',
            metadata: {
              merch_product_id: 'gallery-poster',
              blueprint_id: '282',
              provider_id: '99',
              variant_id: '43138',
              design_slug: 'little-pumpkin'
            }
          }
        }
      }
    ],
    shipping_address_collection: {
      allowed_countries: ['US']
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: 599, // $5.99 Standard Shipping
            currency: 'usd'
          },
          display_name: 'Standard Ground Shipping (3-7 business days)'
        }
      }
    ],
    metadata: {
      order_id: 'order_test_fall_2026_001',
      source: 'printme_fall_2026_launch_verification',
      fulfillment_system: 'printify'
    },
    success_url: 'https://printme-1nsvyv0b9-qaliais-projects.vercel.app/checkout/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://printme-1nsvyv0b9-qaliais-projects.vercel.app/cart'
  });

  console.log('Stripe Checkout Session created successfully!');
  console.log('Session ID:', session.id);
  console.log('Session URL:', session.url);
  console.log('Amount Total:', session.amount_total, 'cents ($' + (session.amount_total / 100).toFixed(2) + ')');
  console.log('Customer Email:', session.customer_email);
  console.log('Payment Status:', session.payment_status);
  console.log('Metadata:', session.metadata);
}

main().catch(console.error);
