import fs from 'node:fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
}

const token = env.PRINTIFY_API_TOKEN;

async function checkBlueprint(bpId) {
  const res = await fetch(`https://api.printify.com/v1/catalog/blueprints/${bpId}/print_providers.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const providers = await res.json();
  console.log(`\n=== Blueprint ${bpId} Providers ===`);
  for (const p of providers) {
    console.log(`- Provider ID: ${p.id}, Title: ${p.title}`);
  }
}

async function checkVariants(bpId, provId) {
  const res = await fetch(`https://api.printify.com/v1/catalog/blueprints/${bpId}/print_providers/${provId}/variants.json`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`BP ${bpId} Prov ${provId} variants status: ${res.status}`);
  if (res.ok) {
    const data = await res.json();
    console.log(`Variants count: ${data.variants?.length}`);
    const sample = (data.variants || []).filter(v => ['M', 'L', 'S', 'XL', '11oz', '12x18', '18x24'].some(k => v.title.includes(k)));
    console.log('Sample matched variants:', sample.map(v => ({ id: v.id, title: v.title, price: v.price })));
  }
}

async function run() {
  await checkBlueprint(12); // Everyday Tee
  await checkVariants(12, 99); // Printify Choice

  await checkBlueprint(282); // Poster
  await checkVariants(282, 99); // Printify Choice
}

run().catch(console.error);
