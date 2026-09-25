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

async function checkBlueprint68() {
  const providersRes = await fetch('https://api.printify.com/v1/catalog/blueprints/68/print_providers.json', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const providers = await providersRes.json();
  console.log('Available providers for Blueprint 68:');
  for (const p of providers) {
    console.log(`- Provider ID: ${p.id}, Title: ${p.title}`);
  }

  // Check Provider 99 variants
  const p99Res = await fetch('https://api.printify.com/v1/catalog/blueprints/68/print_providers/99/variants.json', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Provider 99 variants response status: ${p99Res.status}`);
  if (p99Res.ok) {
    const p99Variants = await p99Res.json();
    console.log('Provider 99 variants:', (p99Variants.variants || []).map(v => ({ id: v.id, title: v.title })));
  } else {
    console.log('Provider 99 error:', await p99Res.text());
  }

  // Check Provider 1 variants
  const p1Res = await fetch('https://api.printify.com/v1/catalog/blueprints/68/print_providers/1/variants.json', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Provider 1 variants response status: ${p1Res.status}`);
  if (p1Res.ok) {
    const p1Variants = await p1Res.json();
    console.log('Provider 1 variants (sample):', (p1Variants.variants || []).slice(0, 5).map(v => ({ id: v.id, title: v.title })));
  }
}

checkBlueprint68().catch(console.error);
