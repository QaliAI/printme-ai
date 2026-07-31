// Printify Shop Listing Utility Script
// Run with: node scripts/printify-list-shops.mjs
// Make sure .env.local is set up first.

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env files manually if running directly in node
function loadEnvFile(filePath, envObj) {
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        if (line.trim().startsWith('#') || !line.includes('=')) return;
        const index = line.indexOf('=');
        const key = line.substring(0, index).trim();
        let value = line.substring(index + 1).trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (key) {
          envObj[key] = value;
        }
      });
    } catch (err) {
      console.warn(`[Warning] Could not load ${filePath}:`, err.message);
    }
  }
}

const env = {};
loadEnvFile(resolve(__dirname, '..', '.env'), env);
loadEnvFile(resolve(__dirname, '..', '.env.local'), env);

const token = process.env.PRINTIFY_API_TOKEN || env.PRINTIFY_API_TOKEN;

if (!token) {
  console.error('❌ PRINTIFY_API_TOKEN is missing. Please configure it in .env.local');
  process.exit(1);
}

console.log('📡 Fetching shops from Printify...\n');

try {
  const res = await fetch('https://api.printify.com/v1/shops.json', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`❌ Printify API responded with ${res.status}: ${res.statusText}`);
    const errorBody = await res.text();
    console.error('Response:', errorBody);
    process.exit(1);
  }

  const shops = await res.json();
  console.log(`✅ Authentication successful. Found ${shops.length} shop(s):\n`);

  for (const shop of shops) {
    console.log(`   • Shop ID: ${shop.id}`);
    console.log(`     Name:    ${shop.title}`);
    console.log(`     Type:    ${shop.sales_channel || 'N/A'}`);
    console.log('');
  }
} catch (err) {
  console.error('❌ Network/API error:', err.message);
  process.exit(1);
}
