#!/usr/bin/env node
// Studio preview bases for additional garments and colours, taken from
// Printify's own flat mockups, with print areas measured instead of guessed.
//
// 1. Calibration: a temporary product whose print file is a solid magenta
//    block filling the placeholder. The block's bounding box in Printify's
//    "front"/"back" mockup is the exact print area for that size.
// 2. Bases: a temporary product with a transparent print file per colour gives
//    the blank garment photo.
// Temporary products live in the PrintMe.AI custom-integration shop, are never
// published, and are deleted at the end. Output is written to
// public/shop-v2/flat/ and lib/commerce/flat-templates.json.
//
//   node --env-file=.env.local scripts/mockups/printify-blank-bases.mjs
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const token = process.env.PRINTIFY_API_TOKEN;
const shop = process.env.PRINTIFY_SHOP_ID;
if (!token || shop !== '22066512') throw new Error('Needs PRINTIFY_API_TOKEN and the PrintMe.AI shop (22066512).');
const SIZE = 800;
const outDir = path.resolve('public/shop-v2/flat');

const api = async (method, url, body) => {
  const response = await fetch(`https://api.printify.com/v1/${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${url} -> ${response.status} ${(await response.text()).slice(0, 300)}`);
  return response.status === 204 ? null : response.json();
};

export const garments = [
  { key: 'tee', blueprint: 12, provider: 99, sizes: ['M', 'L'], colors: ['Natural', 'Black', 'Heather Navy', 'Soft Cream', 'Athletic Heather'], positions: ['front', 'back'] },
  { key: 'crewneck', blueprint: 49, provider: 99, sizes: ['M', 'L', 'XL'], colors: ['Sport Grey', 'Sand', 'Black'], positions: ['front', 'back'] },
  { key: 'hoodie', blueprint: 77, provider: 99, sizes: ['M', 'L', 'XL'], colors: ['Black', 'Sport Grey'], positions: ['front', 'back'] },
];

async function uploadPng(name, buffer) {
  return (await api('POST', 'uploads/images.json', { file_name: name, contents: buffer.toString('base64') })).id;
}

const camera = (src) => new URL(src).searchParams.get('camera_label');
const fetchImage = async (src) => Buffer.from(await (await fetch(src)).arrayBuffer());

async function temporaryProduct(garment, variants, imageIdFor) {
  const placeholders = (variant) =>
    garment.positions
      .filter((position) => variant.placeholders.some((p) => p.position === position))
      .map((position) => ({ position, images: [{ id: imageIdFor(position, variant), x: 0.5, y: 0.5, scale: 1, angle: 0 }] }));
  return api('POST', `shops/${shop}/products.json`, {
    title: `PrintMe calibration ${garment.key}`,
    description: 'Temporary product used to measure print areas. Deleted automatically.',
    blueprint_id: garment.blueprint,
    print_provider_id: garment.provider,
    variants: variants.map((variant) => ({ id: variant.id, price: 3400, is_enabled: true })),
    print_areas: variants.map((variant) => ({ variant_ids: [variant.id], placeholders: placeholders(variant) })),
  });
}

/** Bounding box of saturated magenta pixels, mapped to the 800px base. */
async function magentaBox(buffer) {
  const { data, info } = await sharp(buffer).resize(SIZE, SIZE, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = SIZE, y0 = SIZE, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (r > 150 && b > 120 && g < 110 && r - g > 80) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('No calibration block found');
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

await mkdir(outDir, { recursive: true });
const created = [];
const result = { generatedAt: new Date().toISOString().slice(0, 10), garments: {} };
const provenance = [];
try {
  for (const garment of garments) {
    const { variants } = await api('GET', `catalog/blueprints/${garment.blueprint}/print_providers/${garment.provider}/variants.json`);
    const pick = (color, size) => variants.find((v) => v.options.color === color && v.options.size === size);
    const entry = { blueprint: garment.blueprint, provider: garment.provider, sizes: {}, colors: {} };

    // 1. Calibration per size (geometry is shared by every colour).
    const calibrationVariants = garment.sizes.map((size) => pick(garment.colors[0], size));
    const blocks = new Map();
    const blockId = async (position, variant) => {
      const placeholder = variant.placeholders.find((p) => p.position === position);
      const key = `${placeholder.width}x${placeholder.height}`;
      if (!blocks.has(key)) {
        const png = await sharp({ create: { width: placeholder.width, height: placeholder.height, channels: 4, background: '#ff00ff' } }).png().toBuffer();
        blocks.set(key, await uploadPng(`calibration-${key}.png`, png));
      }
      return blocks.get(key);
    };
    const ids = {};
    for (const variant of calibrationVariants) for (const position of garment.positions) ids[`${variant.id}:${position}`] = await blockId(position, variant);
    const calibration = await temporaryProduct(garment, calibrationVariants, (position, variant) => ids[`${variant.id}:${position}`]);
    created.push(calibration.id);
    for (const variant of calibrationVariants) {
      const size = variant.options.size;
      entry.sizes[size] = {};
      for (const position of garment.positions) {
        const image = calibration.images.find((im) => im.variant_ids.includes(variant.id) && camera(im.src) === position);
        if (!image) continue;
        const placeholder = variant.placeholders.find((p) => p.position === position);
        entry.sizes[size][position] = { printArea: await magentaBox(await fetchImage(image.src)), placeholderWidth: placeholder.width, placeholderHeight: placeholder.height };
      }
    }

    // 2. Blank base per colour (transparent print file).
    const clear = await uploadPng('clear.png', await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer());
    const colourVariants = garment.colors.map((color) => pick(color, garment.sizes[0]));
    const blank = await temporaryProduct(garment, colourVariants, () => clear);
    created.push(blank.id);
    for (const variant of colourVariants) {
      const color = variant.options.color;
      entry.colors[color] = { variantIds: Object.fromEntries(garment.sizes.map((size) => [size, pick(color, size).id])) };
      for (const position of garment.positions) {
        const image = blank.images.find((im) => im.variant_ids.includes(variant.id) && camera(im.src) === position);
        if (!image) continue;
        const slug = `${garment.key}-${color.toLowerCase().replace(/\s+/g, '-')}-${position}`;
        const webp = await sharp(await fetchImage(image.src)).resize(SIZE, SIZE, { fit: 'fill' }).webp({ quality: 86 }).toBuffer();
        await writeFile(path.join(outDir, `${slug}.webp`), webp);
        entry.colors[color][position] = `/shop-v2/flat/${slug}.webp`;
        provenance.push({ path: `/shop-v2/flat/${slug}.webp`, sha256: createHash('sha256').update(webp).digest('hex'), source: 'Printify generated blank mockup', transformation: `camera ${position}, resized to ${SIZE}px`, blueprintId: garment.blueprint, verifiedAt: result.generatedAt });
      }
    }
    result.garments[garment.key] = entry;
    console.log(garment.key, JSON.stringify(entry.sizes));
  }
} finally {
  for (const id of created) await api('DELETE', `shops/${shop}/products/${id}.json`).catch((error) => console.warn('delete failed', id, error.message));
  console.log('deleted', created.length, 'temporary products');
}
await writeFile('lib/commerce/flat-templates.json', JSON.stringify(result, null, 2) + '\n');
const manifestPath = path.resolve('public/shop-v2/blank-product-provenance.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const built = new Set(provenance.map((entry) => entry.path));
manifest.assets = [...manifest.assets.filter((entry) => !built.has(entry.path)), ...provenance];
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
