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

async function main() {
  // Check Blueprint 68 providers
  const bp68Prov = await (await fetch('https://api.printify.com/v1/catalog/blueprints/68/print_providers.json', {
    headers: { Authorization: `Bearer ${token}` }
  })).json();
  console.log('BP 68 Providers:', bp68Prov.map(p => ({ id: p.id, title: p.title })));

  // For provider 1 (SPOKE Custom Products) or other providers for BP 68:
  for (const p of bp68Prov.slice(0, 3)) {
    const vRes = await (await fetch(`https://api.printify.com/v1/catalog/blueprints/68/print_providers/${p.id}/variants.json`, {
      headers: { Authorization: `Bearer ${token}` }
    })).json();
    console.log(`BP 68 Provider ${p.id} (${p.title}) variants sample:`, vRes.variants?.slice(0, 2));

    const sRes = await (await fetch(`https://api.printify.com/v1/catalog/blueprints/68/print_providers/${p.id}/shipping.json`, {
      headers: { Authorization: `Bearer ${token}` }
    })).json();
    console.log(`BP 68 Provider ${p.id} shipping:`, sRes.profiles?.[0]?.first_item);
  }

  // Check Blueprint 282 variants keys
  const bp282Var = await (await fetch('https://api.printify.com/v1/catalog/blueprints/282/print_providers/99/variants.json', {
    headers: { Authorization: `Bearer ${token}` }
  })).json();
  console.log('BP 282 Provider 99 first variant keys:', bp282Var.variants?.[0]);

  // Check Blueprint 12 variants keys
  const bp12Var = await (await fetch('https://api.printify.com/v1/catalog/blueprints/12/print_providers/99/variants.json', {
    headers: { Authorization: `Bearer ${token}` }
  })).json();
  console.log('BP 12 Provider 99 first variant keys:', bp12Var.variants?.[0]);
}

main().catch(console.error);
