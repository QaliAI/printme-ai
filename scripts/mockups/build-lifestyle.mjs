#!/usr/bin/env node
/**
 * Marketing lifestyle images: Issue Nº 01 artwork composited onto Printify's
 * official model/product photography of the approved Bella+Canvas 3001 blank.
 *
 * These are STYLED MARKETING PHOTOS, not order previews. Pages that show them
 * must label them as styled photos; the exact purchasable preview always comes
 * from InstantPreview + the product templates.
 *
 * Shading: the artwork is multiplied by the photo's own fabric luminance
 * (normalised to the median cloth tone) so folds fall across the print.
 *
 * Run: node scripts/mockups/build-lifestyle.mjs [--calibrate]
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'public', 'lifestyle');
const calibrate = process.argv.includes('--calibrate');
mkdirSync(out, { recursive: true });

/** box = print rectangle in source pixels (2048 px Printify photos). */
const shots = [
  {
    id: 'bad-ideas-club-model',
    url: 'https://images.printify.com/66d81b70295ea4f038065152',
    art: 'bad-ideas-club',
    box: { x: 862, y: 726, width: 368, height: 447 },
    crop: { left: 324, top: 0, width: 1400, height: 1750 },
  },
  {
    id: 'make-shit-print-shit-model',
    url: 'https://images.printify.com/66d81b850482d2ef57061f33',
    art: 'make-shit-print-shit',
    box: { x: 912, y: 712, width: 314, height: 382 },
    crop: { left: 274, top: 0, width: 1500, height: 1875 },
  },
  {
    id: 'creature-of-habit-detail',
    url: 'https://images.printify.com/66d81b7f295ea4f038065153',
    art: 'creature-of-habit',
    box: { x: 815, y: 812, width: 445, height: 540 },
    crop: { left: 640, top: 640, width: 800, height: 1000 },
  },
];

async function fetchImage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function shadeFor(photo, box, strength = 1.6) {
  const { data, info } = await sharp(photo).extract({ left: box.x, top: box.y, width: box.width, height: box.height }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const sorted = [...data].sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * 0.6)] * 1.01;
  const shade = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) shade[i] = Math.round(255 * Math.pow(Math.min(1, data[i] / ref), strength));
  return sharp(shade, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toBuffer();
}

for (const shot of shots) {
  const photo = await sharp(await fetchImage(shot.url)).removeAlpha().toBuffer();
  const { box } = shot;
  // Art is fitted inside the print rectangle exactly as DTG would place it (contain, top-aligned).
  const art = await sharp(join(root, 'public', 'designs', 'issue-01', `${shot.art}.png`))
    .resize(box.width, box.height, { fit: 'contain', position: 'top', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  // Multiply shading applied to the artwork only, then composited onto the photo.
  const shade = await shadeFor(photo, box);
  const shadedArt = await sharp(art).composite([{ input: shade, blend: 'multiply' }, { input: art, blend: 'dest-in' }]).png().toBuffer();
  const layers = [{ input: shadedArt, left: box.x, top: box.y }];
  if (calibrate) {
    layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}"><rect width="100%" height="100%" fill="none" stroke="#FF2B91" stroke-width="4" stroke-dasharray="12 8"/></svg>`), left: box.x, top: box.y });
  }
  const composite = await sharp(photo).composite(layers).toBuffer();
  const framed = sharp(composite).extract(shot.crop);
  await framed.clone().resize(1200).webp({ quality: 84 }).toFile(join(out, `${shot.id}.webp`));
  await framed.clone().resize(640).webp({ quality: 80 }).toFile(join(out, `${shot.id}-640.webp`));
  console.log('built', shot.id);
}
