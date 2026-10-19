#!/usr/bin/env node
// Official Printify mockups for PrintMe designs.
//
// For each job: upload the print file(s) to the PrintMe.AI custom-integration
// shop, create a temporary unpublished product on the exact blueprint, provider
// and colour we sell, read back Printify's generated mockups (models, lifestyle,
// flat, hanging...), save them, then delete the temporary product. Nothing is
// published and no order is created.
//
//   node --env-file=.env.local scripts/mockups/printify-mockups.mjs survey <outDir> [--only slug]
//   node --env-file=.env.local scripts/mockups/printify-mockups.mjs pick <selection.json>
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const token = process.env.PRINTIFY_API_TOKEN;
const shop = process.env.PRINTIFY_SHOP_ID;
if (!token || shop !== '22066512') throw new Error('Needs PRINTIFY_API_TOKEN and the PrintMe.AI shop (22066512).');
const api = async (method, url, body) => {
  const response = await fetch(`https://api.printify.com/v1/${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${url} -> ${response.status} ${(await response.text()).slice(0, 300)}`);
  return response.status === 204 ? null : response.json();
};

export const jobs = [
  { slug: 'second-helping-athletics', blueprint: 49, provider: 99, color: 'Sport Grey', size: 'L', prints: { front: 'public/designs/q4-2026/second-helping-athletics.png' } },
  { slug: 'soup-of-the-day', blueprint: 68, provider: 1, color: null, size: null, prints: { front: 'public/designs/q4-2026/soup-of-the-day.png' }, mugSides: true },
  { slug: 'supervising-the-decorations', blueprint: 12, provider: 99, color: 'Natural', size: 'L', prints: { front: 'public/designs/q4-2026/supervising-the-decorations.png' } },
  { slug: 'one-more-chapter-tour', blueprint: 12, provider: 99, color: 'Black', size: 'L', prints: { front: 'public/designs/q4-2026/one-more-chapter-tour.png' } },
  { slug: 'made-by-machines', blueprint: 77, provider: 99, color: 'Black', size: 'L', prints: { front: 'public/designs/q4-2026/made-by-machines.png' } },
  { slug: 'low-power-mode', blueprint: 12, provider: 99, color: 'Heather Navy', size: 'L', prints: { front: 'public/designs/q4-2026/low-power-mode.png' } },
  { slug: 'he-saw-the-group-chat', blueprint: 282, provider: 99, variant: 43138, prints: { front: 'public/designs/q4-2026/he-saw-the-group-chat.png' } },
  { slug: 'civilized-trash', blueprint: 12, provider: 99, color: 'Soft Cream', size: 'L', prints: { front: 'public/designs/originals/civilized-trash.png' } },
  { slug: 'carved-under-protest', blueprint: 12, provider: 99, color: 'White', size: 'L', prints: { front: 'public/designs/originals/carved-under-protest.png' } },
  { slug: 'professional-rummager', blueprint: 12, provider: 99, color: 'Athletic Heather', size: 'L', prints: { front: 'public/designs/originals/professional-rummager.png' } },
];

async function upload(file) {
  const contents = (await readFile(file)).toString('base64');
  const result = await api('POST', 'uploads/images.json', { file_name: path.basename(file), contents });
  return result.id;
}

async function variantFor(job) {
  if (job.variant) return job.variant;
  const { variants } = await api('GET', `catalog/blueprints/${job.blueprint}/print_providers/${job.provider}/variants.json`);
  const match = variants.find((v) => (!job.color || v.options.color === job.color) && (!job.size || v.options.size === job.size)) ?? variants[0];
  return match.id;
}

async function createTemporaryProduct(job) {
  const variant = await variantFor(job);
  const placeholders = [];
  for (const [position, file] of Object.entries(job.prints)) {
    const id = await upload(file);
    // Print files are made at the exact placeholder size, so scale 1 fills it.
    const images = job.mugSides
      ? [0.25, 0.75].map((x) => ({ id, x, y: 0.5, scale: 1275 / 2700, angle: 0 }))
      : [{ id, x: 0.5, y: 0.5, scale: 1, angle: 0 }];
    placeholders.push({ position, images });
  }
  const product = await api('POST', `shops/${shop}/products.json`, {
    title: `PrintMe mockup ${job.slug}`,
    description: 'Temporary product used to render official mockups. Deleted automatically.',
    blueprint_id: job.blueprint,
    print_provider_id: job.provider,
    variants: [{ id: variant, price: 3400, is_enabled: true }],
    print_areas: [{ variant_ids: [variant], placeholders }],
  });
  return { product, variant };
}

const label = (src) => new URL(src).searchParams.get('camera_label') ?? 'default';

async function survey(outDir) {
  await mkdir(outDir, { recursive: true });
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
  const report = {};
  for (const job of jobs) {
    if (only && job.slug !== only) continue;
    const { product, variant } = await createTemporaryProduct(job);
    try {
      const images = product.images.filter((image) => image.variant_ids.includes(variant));
      report[job.slug] = { productId: product.id, variant, blueprint: job.blueprint, provider: job.provider, color: job.color, images: images.map((image) => ({ label: label(image.src), src: image.src })) };
      // Contact sheet of every camera so a human can pick distinct shots.
      const thumbs = [];
      for (const image of images) {
        const response = await fetch(image.src);
        if (!response.ok) continue;
        const buffer = Buffer.from(await response.arrayBuffer());
        const caption = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="28"><rect width="300" height="28" fill="#000"/><text x="6" y="20" font-family="monospace" font-size="16" fill="#fff">${label(image.src)}</text></svg>`);
        thumbs.push(await sharp(buffer).resize(300, 300, { fit: 'cover' }).composite([{ input: caption, top: 272, left: 0 }]).jpeg().toBuffer());
      }
      const cols = 6;
      const rows = Math.ceil(thumbs.length / cols);
      await sharp({ create: { width: cols * 300, height: rows * 300, channels: 3, background: '#222' } })
        .composite(thumbs.map((input, i) => ({ input, left: (i % cols) * 300, top: Math.floor(i / cols) * 300 })))
        .jpeg({ quality: 80 })
        .toFile(path.join(outDir, `${job.slug}.jpg`));
      console.log(`${job.slug}: ${images.length} mockups (${[...new Set(images.map((i) => label(i.src)))].join(', ')})`);
    } finally {
      await writeFile(path.join(outDir, 'survey.json'), JSON.stringify(report, null, 2));
    }
  }
}

/** selection.json: { surveyPath, outDir, picks: { slug: ["person-3", "lifestyle"] }, keep?: boolean } */
async function pick(selectionPath) {
  const selection = JSON.parse(await readFile(selectionPath, 'utf8'));
  const report = JSON.parse(await readFile(selection.surveyPath, 'utf8'));
  await mkdir(selection.outDir, { recursive: true });
  const provenance = [];
  for (const [slug, labels] of Object.entries(selection.picks)) {
    const entry = report[slug];
    for (const wanted of labels) {
      const image = entry.images.find((candidate) => candidate.label === wanted);
      if (!image) throw new Error(`${slug}: no ${wanted}`);
      const response = await fetch(image.src);
      const buffer = Buffer.from(await response.arrayBuffer());
      const file = `${slug}--${wanted}.webp`;
      await sharp(buffer).resize(1200, 1200, { fit: 'inside' }).webp({ quality: 84 }).toFile(path.join(selection.outDir, file));
      provenance.push({ file, design: slug, camera: wanted, blueprint: entry.blueprint, provider: entry.provider, color: entry.color, source: 'Printify generated mockup', renderedAt: new Date().toISOString().slice(0, 10) });
      console.log('saved', file);
    }
  }
  await writeFile(path.join(selection.outDir, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  if (!selection.keep) {
    for (const [slug, entry] of Object.entries(report)) {
      await api('DELETE', `shops/${shop}/products/${entry.productId}.json`).catch((error) => console.warn('delete failed', slug, error.message));
      console.log('deleted temporary product', slug);
    }
  }
}

const [mode, target] = process.argv.slice(2);
if (mode === 'survey') await survey(target);
else if (mode === 'pick') await pick(target);
else console.log('usage: survey <outDir> | pick <selection.json>');
