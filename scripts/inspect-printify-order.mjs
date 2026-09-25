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
const orderId = '6ab0a0d202775cc273050a18';

async function main() {
  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders/${orderId}.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Fetch order status:', res.status);
  const data = await res.json();
  console.log('Order ID:', data.id);
  console.log('Status:', data.status);
  console.log('Total price (cents):', data.total_price);
  console.log('Total shipping (cents):', data.total_shipping);
  console.log('Line items:', JSON.stringify(data.line_items, null, 2));
  console.log('Address to:', JSON.stringify(data.address_to, null, 2));
  console.log('Full Order Details:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
