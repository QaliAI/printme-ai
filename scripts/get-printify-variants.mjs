// Fetch print area positioning for our selected blueprints
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envText = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
}

const token = env.PRINTIFY_API_TOKEN;
async function api(path) {
  const res = await fetch(`https://api.printify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

// Get print providers for tshirt (id 12) to see print area dimensions
console.log('🔍 Getting print providers for Bella+Canvas 3001 Tee (id 12)\n');
const providers = await api('/catalog/blueprints/12/print_providers.json');
console.log(`Found ${providers.length} print providers`);
console.log('First provider:', JSON.stringify(providers[0], null, 2));

// Get variants from first provider to see print area dimensions
if (providers.length > 0) {
  const providerId = providers[0].id;
  console.log(`\n🔍 Getting variants from provider ${providerId}\n`);
  const data = await api(`/catalog/blueprints/12/print_providers/${providerId}/variants.json`);
  console.log('Variant data keys:', Object.keys(data));
  if (data.variants && data.variants.length > 0) {
    console.log('First variant:', JSON.stringify(data.variants[0], null, 2).slice(0, 800));
  }
}
