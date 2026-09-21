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

async function getProviderVariants(blueprintId, providerId) {
  const res = await fetch(`https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

async function getProviderShipping(blueprintId, providerId) {
  const res = await fetch(`https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/shipping.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

async function main() {
  console.log('--- Hero Products Provider Costs & Shipping ---');

  // 1. Everyday Tee: Blueprint 12, Provider 99 (or Provider 39)
  console.log('\n1. Everyday Tee (Blueprint 12, Provider 99 / 39):');
  const teeVar99 = await getProviderVariants(12, 99);
  const teeShip99 = await getProviderShipping(12, 99);
  const mVariant = teeVar99.variants?.find(v => v.id === 18541 || v.title.includes('White / M'));
  console.log('Tee M Variant cost (cents):', mVariant?.cost, 'title:', mVariant?.title);
  console.log('Tee Shipping (cents):', teeShip99.profiles?.[0]?.first_item?.cost);

  // 2. Keepsake Mug: Blueprint 68, Provider 99 (or Provider 1)
  console.log('\n2. Keepsake Mug (Blueprint 68, Provider 99):');
  const mugVar99 = await getProviderVariants(68, 99);
  const mugShip99 = await getProviderShipping(68, 99);
  const mug11oz = mugVar99.variants?.find(v => v.id === 721 || v.title.includes('11oz') || v.title.includes('11 oz'));
  console.log('Mug 11oz Variant cost (cents):', mug11oz?.cost, 'title:', mug11oz?.title);
  console.log('Mug Shipping (cents):', mugShip99.profiles?.[0]?.first_item?.cost);

  // 3. Gallery Poster: Blueprint 282, Provider 99 (or Provider 1 / 2)
  console.log('\n3. Gallery Poster (Blueprint 282, Provider 99):');
  const posterVar99 = await getProviderVariants(282, 99);
  const posterShip99 = await getProviderShipping(282, 99);
  const poster12x18 = posterVar99.variants?.find(v => v.id === 43138 || v.title.includes('12″ x 18″') || v.title.includes('12x18') || v.title.includes('12 × 18'));
  const poster18x24 = posterVar99.variants?.find(v => v.id === 43144 || v.title.includes('18″ x 24″') || v.title.includes('18x24') || v.title.includes('18 × 24'));
  console.log('Poster 12x18 cost (cents):', poster12x18?.cost, 'title:', poster12x18?.title);
  console.log('Poster 18x24 cost (cents):', poster18x24?.cost, 'title:', poster18x24?.title);
  console.log('Poster Shipping (cents):', posterShip99.profiles?.[0]?.first_item?.cost);
}

main().catch(console.error);
