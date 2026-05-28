// Get full details and ALL mockup images for our selected blueprints
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

// Selected blueprint IDs
const SELECTED = [
  { category: 'tshirt', id: 12, name: 'Bella+Canvas 3001 Tee' },
  { category: 'mug', id: 68, name: '11oz Mug' },
  { category: 'poster', id: 282, name: 'Matte Vertical Posters' },
  { category: 'hoodie', id: 77, name: 'Gildan 18500 Hoodie' },
  { category: 'phoneCase', id: 268, name: 'Slim Phone Cases' },
  { category: 'toteBag', id: 553, name: 'Cotton Tote Bag' },
  { category: 'sticker', id: 400, name: 'Kiss-Cut Stickers' },
];

// Search for canvas products specifically
console.log('🔍 Searching for canvas products...\n');
const blueprints = await api('/catalog/blueprints.json');
const canvasMatches = blueprints.filter((b) => {
  const t = (b.title || '').toLowerCase();
  return (t.includes('canvas') && !t.includes('bella')) || t.includes('wall art') || t.includes('wrapped');
});
console.log(`Found ${canvasMatches.length} canvas/wall art products:`);
for (const b of canvasMatches.slice(0, 8)) {
  console.log(`  • [${b.id}] ${b.title} — ${(b.images || []).length} images`);
}

console.log('\n\n📋 Full mockup details for selected products:\n');

for (const sel of SELECTED) {
  console.log(`\n═══ ${sel.category.toUpperCase()}: [${sel.id}] ${sel.name} ═══`);
  try {
    const bp = await api(`/catalog/blueprints/${sel.id}.json`);
    console.log(`Title: ${bp.title}`);
    console.log(`Brand: ${bp.brand} | Model: ${bp.model}`);
    console.log(`Print areas: ${(bp.print_areas || []).join(', ') || 'see variants'}`);
    console.log(`Mockup images (${(bp.images || []).length}):`);
    for (let i = 0; i < Math.min(bp.images?.length || 0, 5); i++) {
      console.log(`  [${i}] ${bp.images[i]}`);
    }
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
  }
}
