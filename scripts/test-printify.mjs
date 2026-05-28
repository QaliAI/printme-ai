// Quick connectivity test for Printify API
// Run with: node scripts/test-printify.mjs
// Make sure .env.local is set up first.

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Manually load .env.local
const envPath = resolve(__dirname, '..', '.env.local');
let envText = '';
try {
  envText = readFileSync(envPath, 'utf-8');
} catch (err) {
  console.error('❌ Could not read .env.local at', envPath);
  process.exit(1);
}

const env = {};
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  // Strip surrounding quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const token = env.PRINTIFY_API_TOKEN;
const shopId = env.NEXT_PUBLIC_PRINTIFY_SHOP_ID || env.PRINTIFY_SHOP_ID;

console.log('🔍 Checking Printify configuration...\n');

if (!token) {
  console.error('❌ PRINTIFY_API_TOKEN is missing from .env.local');
  process.exit(1);
}
console.log('✅ PRINTIFY_API_TOKEN found (length:', token.length, 'chars)');

if (!shopId) {
  console.error('❌ NEXT_PUBLIC_PRINTIFY_SHOP_ID is missing from .env.local');
  process.exit(1);
}
console.log('✅ Shop ID found:', shopId);

console.log('\n📡 Testing Printify API connection...\n');

// Test 1: List all shops on the account (validates token)
try {
  const res = await fetch('https://api.printify.com/v1/shops.json', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`❌ API responded with ${res.status}: ${res.statusText}`);
    const errorBody = await res.text();
    console.error('Response:', errorBody);
    process.exit(1);
  }

  const shops = await res.json();
  console.log('✅ Token is valid! Found', shops.length, 'shop(s) on this account:\n');

  for (const shop of shops) {
    const match = shop.id.toString() === shopId.toString() ? ' ← matches your SHOP_ID' : '';
    console.log(`   • Shop ID ${shop.id}: ${shop.title} (${shop.sales_channel})${match}`);
  }

  // Validate the configured shop ID matches one returned
  const matched = shops.find((s) => s.id.toString() === shopId.toString());
  if (!matched) {
    console.error(`\n⚠️  WARNING: Your NEXT_PUBLIC_PRINTIFY_SHOP_ID (${shopId}) does not match any shop on this account.`);
    console.error('   Update .env.local to use one of the IDs above.');
    process.exit(1);
  }

  console.log(`\n✅ Configured shop matched: "${matched.title}"`);
} catch (err) {
  console.error('❌ Network/API error:', err.message);
  process.exit(1);
}

// Test 2: Try to fetch products from the catalog (validates basic read access)
try {
  const res = await fetch('https://api.printify.com/v1/catalog/blueprints.json', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    const blueprints = await res.json();
    console.log(`\n✅ Catalog accessible: ${blueprints.length} product blueprints available`);
  } else {
    console.warn(`\n⚠️  Catalog request returned ${res.status} (this may be a permissions issue)`);
  }
} catch (err) {
  console.warn('\n⚠️  Could not fetch catalog:', err.message);
}

console.log('\n🎉 Printify is wired up correctly!\n');
console.log('Next steps:');
console.log('  1. Add the same env vars to Vercel (Settings → Environment Variables)');
console.log('  2. Redeploy on Vercel so the production app gets them');
console.log('  3. Test placing a real order through the app\n');
