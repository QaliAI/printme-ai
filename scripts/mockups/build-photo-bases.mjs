#!/usr/bin/env node
/**
 * Builds photographic product bases for the InstantPreview engine from
 * Printify's official catalog photography of the exact approved blanks
 * (Bella+Canvas 3001 tee = blueprint 12, matte vertical poster = 282,
 * 11 oz mug = 68). GET-only catalog requests; nothing is written to Printify.
 *
 * For each view it writes an 800x800 base (cropped so the template print
 * box matches real garment/paper proportions) and a multiply "shade" map
 * derived from the photo's own luminance, so printed artwork picks up the
 * real fabric folds and ceramic curvature. Print-area geometry lives in
 * lib/commerce/templates.ts; keep the boxes below in sync with it.
 *
 * Run: node --env-file=.env.local scripts/mockups/build-photo-bases.mjs [--calibrate <outDir>]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'public', 'shop-v2', 'photo');
const calibrateDir = process.argv.includes('--calibrate') ? process.argv[process.argv.indexOf('--calibrate') + 1] : null;
const SIZE = 800;

/** Source photos (Printify catalog image URLs for the approved blueprints). */
const sources = {
  teeFront: { blueprintId: 12, url: 'https://images.printify.com/66d81b7f295ea4f038065153' },
  teeBack: { blueprintId: 12, url: 'https://images.printify.com/66d81b8d0482d2ef57061f34' },
  poster: { blueprintId: 282, url: 'https://images.printify.com/66d868d28aeee92f550445e7' },
  mug: { blueprintId: 68, url: 'https://images.printify.com/66c42e5361b2691da8085442' },
};

/**
 * View definitions. crop = [left, top, size] in source pixels (2048 px sources).
 * box = print area in the 800x800 output (must equal templates.ts printArea).
 */
export const photoViews = [
  { id: 'tee-front', src: 'teeFront', crop: [420, 380, 1300], box: { x: 242, y: 268, width: 275, height: 334 } },
  { id: 'tee-back', src: 'teeBack', crop: [268, 207, 1506], box: { x: 248, y: 250, width: 275, height: 334 } },
  { id: 'poster-12x18', src: 'poster', crop: [35, 35, 1981], box: { x: 178, y: 62, width: 462, height: 693 }, noShade: true },
  { id: 'poster-18x24', src: 'poster', crop: [35, 35, 1981], box: { x: 148, y: 62, width: 520, height: 693 }, paintSheet: true, noShade: true },
  // mugs already use the official blank; only the shade map is derived from the committed bases
  { id: 'mug-left', existing: 'public/shop-v2/mug-left-base.webp', src: 'mug', box: { x: 218, y: 245, width: 270, height: 248 }, shadeOnly: true },
  { id: 'mug-right', existing: 'public/shop-v2/mug-right-base.webp', src: 'mug', box: { x: 316, y: 245, width: 270, height: 248 }, shadeOnly: true },
];

async function fetchSource(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Paint a borderless sheet of the requested box size over the photo's original sheet. */
async function paintSheet(base, box) {
  const { data, info } = await sharp(base).removeAlpha().extract({ left: box.x + 60, top: box.y + 200, width: 40, height: 40 }).raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += info.channels) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  const n = data.length / info.channels;
  const fill = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
<defs><filter id="s" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient></defs>
<rect x="${box.x + 3}" y="${box.y + 6}" width="${box.width}" height="${box.height}" fill="#000" opacity=".16" filter="url(#s)"/>
<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${fill}"/>
<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="url(#g)"/>
<rect x="${box.x + 0.5}" y="${box.y + 0.5}" width="${box.width - 1}" height="${box.height - 1}" fill="none" stroke="#000" stroke-opacity=".06"/></svg>`;
  return sharp(base).composite([{ input: Buffer.from(svg) }]).toBuffer();
}

/**
 * Multiply shading map. Luminance is normalised to the median fabric tone, so
 * flat cloth/paper stays at 1.0 and only folds, seams and curvature darken
 * the print. The effect fades out over a feathered border to avoid seams.
 */
async function shadeMap(base, box, strength) {
  // High-pass fold map: luminance divided by its own blur. Flat cloth is
  // exactly 1.0, so only creases/curvature darken the print (no visible box).
  const grey = sharp(base).greyscale();
  const { data, info } = await grey.clone().raw().toBuffer({ resolveWithObject: true });
  const { data: blur } = await grey.clone().blur(14).raw().toBuffer({ resolveWithObject: true });
  const pad = Math.round(box.width * 0.06);
  const x0 = Math.max(0, box.x - pad), x1 = Math.min(info.width, box.x + box.width + pad);
  const y0 = Math.max(0, box.y - pad), y1 = Math.min(info.height, box.y + box.height + pad);
  const out = Buffer.alloc(info.width * info.height, 255);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * info.width + x;
      const edge = Math.min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y) / pad;
      const feather = Math.max(0, Math.min(1, edge));
      const ratio = blur[i] ? data[i] / blur[i] : 1;
      const v = Math.pow(Math.min(1, ratio * 1.015), strength);
      out[i] = Math.round(255 * (1 - feather * (1 - v)));
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 1 } }).png({ compressionLevel: 9 }).toBuffer();
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
mkdirSync(outDir, { recursive: true });
const cache = {};
const provenance = [];
for (const view of photoViews) {
  const source = sources[view.src];
  let base;
  if (view.existing) {
    base = await sharp(join(root, view.existing)).resize(SIZE, SIZE).toBuffer();
  } else {
    cache[view.src] ??= await fetchSource(source.url);
    const [left, top, size] = view.crop;
    base = await sharp(cache[view.src]).extract({ left, top, width: size, height: size }).resize(SIZE, SIZE).toBuffer();
  }
  if (view.mirror) base = await sharp(base).flop().toBuffer();
  if (view.paintSheet) base = await paintSheet(base, view.box);
  // Flat paper gets no shade map: its photo has no folds worth transferring.
  const shade = view.noShade ? null : await shadeMap(base, view.box, view.src.startsWith('tee') ? 2.2 : 1.4);
  if (shade) {
    const shadeFile = `${view.id}-shade.png`;
    writeFileSync(join(outDir, shadeFile), shade);
    provenance.push({ path: `/shop-v2/photo/${shadeFile}`, sha256: sha(shade), source: source.url, transformation: 'luminance multiply map inside print area', blueprintId: source.blueprintId });
  }
  if (!view.shadeOnly) {
    const webp = await sharp(base).webp({ quality: 86 }).toBuffer();
    const baseFile = `${view.id}.webp`;
    writeFileSync(join(outDir, baseFile), webp);
    provenance.push({
      path: `/shop-v2/photo/${baseFile}`,
      sha256: sha(webp),
      source: source.url,
      transformation: `crop ${view.crop?.join(',')} to ${SIZE}px${view.mirror ? ', mirrored' : ''}${view.paintSheet ? ', 3:4 sheet painted over original sheet' : ''}`,
      blueprintId: source.blueprintId,
    });
  }
  if (calibrateDir) {
    mkdirSync(calibrateDir, { recursive: true });
    const art = await sharp(join(root, 'public/designs/issue-01/creature-of-habit.png'))
      .resize(Math.round(view.box.width * 0.9), Math.round(view.box.height * 0.9), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    const meta = await sharp(art).metadata();
    const comp = await sharp(base)
      .composite([
        { input: art, left: view.box.x + Math.round((view.box.width - meta.width) / 2), top: view.box.y + Math.round((view.box.height - meta.height) / 2) },
        ...(shade ? [{ input: shade, blend: 'multiply' }] : []),
        { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect x="${view.box.x}" y="${view.box.y}" width="${view.box.width}" height="${view.box.height}" fill="none" stroke="#FF2B91" stroke-dasharray="6 6"/></svg>`) },
      ])
      .jpeg({ quality: 82 }).toFile(join(calibrateDir, `${view.id}.jpg`));
    void comp;
  }
  console.log('built', view.id);
}
// Merge into the reviewed-blank manifest checked by tests/commerce/blank-preview-architecture.test.ts.
const manifestPath = join(root, 'public', 'shop-v2', 'blank-product-provenance.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const built = new Set(provenance.map((entry) => entry.path));
manifest.assets = [...manifest.assets.filter((entry) => !built.has(entry.path)), ...provenance.map((entry) => ({ ...entry, verifiedAt: '2026-10-12' }))];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
