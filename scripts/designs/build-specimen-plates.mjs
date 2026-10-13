#!/usr/bin/env node
// Builds the PrintMe "Specimen Plates" originals: an engraved animal or object
// sandwiched between a serif headline and an italic punchline, with a
// natural-history figure label and a deadpan kicker.
//
//   node scripts/designs/build-specimen-plates.mjs [--out public/designs/originals] [--only slug]
//
// Illustrations: generated for PrintMe with Figma AI on 2026-10-12 from
// text-only prompts (no reference images), then keyed and upscaled by
// lib/engraving.mjs. Prompts are recorded in sources/README.md.
// Type: DM Serif Display + Space Mono (SIL OFL 1.1), converted to outlines.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { engravingToLayer } from './lib/engraving.mjs';
import { capHeight, loadFont, sizeToWidth, textPath } from './lib/outlined-type.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const outDir = path.resolve(arg('--out') ?? 'public/designs/originals');
const only = arg('--only');

// Matches the tee front print area used by the rest of the catalog.
const W = 3951;
const H = 4800;
// Layout constants below were tuned on a 4500 px canvas.
const f = W / 4500;
const INK = '#1d1a17';

export const plates = [
  {
    slug: 'civilized-trash',
    source: 'civilized-trash-possum.png',
    label: 'FIG. 04  ·  DIDELPHIS VIRGINIANA',
    top: 'CIVILIZED',
    bottom: 'trash',
    bottomWidth: 0.86,
    kicker: 'WILL PLAY DEAD TO AVOID SMALL TALK.',
    accent: '#c9737f',
    // Optical centre of the body (the tail hangs to the right).
    anchorX: 0.4,
    overlap: 0.1,
  },
  {
    slug: 'carved-under-protest',
    source: 'carved-under-protest-pumpkin.png',
    label: 'FIG. 31  ·  CUCURBITA PEPO',
    top: 'CARVED',
    bottom: 'under protest',
    bottomWidth: 1,
    kicker: "OCTOBER'S MOST RELUCTANT DECORATION.",
    accent: '#c0632b',
    anchorX: 0.5,
    overlap: 0.02,
    maxArtWidth: 0.86,
  },
  {
    slug: 'professional-rummager',
    source: 'professional-rummager-raccoon.png',
    label: 'FIG. 07  ·  PROCYON LOTOR',
    top: 'PROFESSIONAL',
    bottom: 'rummager',
    bottomWidth: 0.92,
    kicker: 'OPEN TO OPPORTUNITIES. AND LIDS.',
    accent: '#3f7f7a',
    anchorX: 0.44,
    // Lowercase m/n tops must stay readable: feet rest just above the x-height.
    overlap: -0.015,
  },
];

const serif = loadFont(path.join(here, 'fonts/DMSerifDisplay-Regular.ttf'));
const serifItalic = loadFont(path.join(here, 'fonts/DMSerifDisplay-Italic.ttf'));
const mono = loadFont(path.join(here, 'fonts/SpaceMono-Bold.ttf'));

async function buildPlate(plate) {
  const art = await engravingToLayer(path.join(here, 'sources', plate.source));
  const margin = 150 * f;
  const inner = W - margin * 2;

  const labelSize = 92 * f;
  const labelBaseline = margin + capHeight(mono, labelSize);
  const label = textPath(mono, plate.label, { x: W / 2, y: labelBaseline, size: labelSize, tracking: 0.18, align: 'center' });

  const topSize = Math.min(sizeToWidth(serif, plate.top, inner, 0.02), 1100 * f);
  const topBaseline = labelBaseline + 120 * f + capHeight(serif, topSize);
  const top = textPath(serif, plate.top, { x: W / 2, y: topBaseline, size: topSize, tracking: 0.02, align: 'center' });

  const kickerSize = Math.min(116 * f, sizeToWidth(mono, plate.kicker, inner, 0.06));
  const kickerBaseline = H - margin;
  const kicker = textPath(mono, plate.kicker, { x: W / 2, y: kickerBaseline, size: kickerSize, tracking: 0.06, align: 'center' });

  const bottomSize = Math.min(sizeToWidth(serifItalic, plate.bottom, inner * plate.bottomWidth, 0.01), 1500 * f);
  const bottomBaseline = kickerBaseline - kickerSize - 150 * f;
  const bottom = textPath(serifItalic, plate.bottom, { x: W / 2, y: bottomBaseline, size: bottomSize, tracking: 0.01, align: 'center' });
  const bottomTop = bottomBaseline - capHeight(serifItalic, bottomSize) * 0.72;

  // The subject stands on the punchline: its base overlaps the word slightly.
  const artTop = topBaseline + 100 * f;
  const artBottom = bottomTop + bottomSize * plate.overlap;
  let artHeight = Math.round(artBottom - artTop);
  let artWidth = Math.round((art.width / art.height) * artHeight);
  const maxWidth = inner * (plate.maxArtWidth ?? 1);
  if (artWidth > maxWidth) {
    artWidth = Math.round(maxWidth);
    artHeight = Math.round((art.height / art.width) * artWidth);
  }
  const subject = await sharp(art.png).resize(artWidth, artHeight, { kernel: 'lanczos3' }).png().toBuffer();
  const artLeft = Math.round(W / 2 - artWidth * plate.anchorX);
  const artY = Math.round(artBottom - artHeight);

  const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  const below = svg(`<path d="${bottom.d}" fill="${plate.accent}"/>`);
  const above = svg(`
    <path d="${label.d}" fill="${INK}"/>
    <rect x="${(W - label.width) / 2}" y="${labelBaseline + 48 * f}" width="${label.width}" height="${10 * f}" fill="${INK}"/>
    <path d="${top.d}" fill="${INK}"/>
    <path d="${kicker.d}" fill="${INK}"/>`);

  const master = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: Buffer.from(below), top: 0, left: 0 },
      { input: subject, top: artY, left: artLeft },
      { input: Buffer.from(above), top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toBuffer();

  await writeFile(path.join(outDir, `${plate.slug}.png`), master);
  await sharp(master).resize(1200).webp({ quality: 88 }).toFile(path.join(outDir, `${plate.slug}.webp`));
  console.log(`${plate.slug}: ${W}x${H}, art ${artWidth}x${artHeight} at ${artLeft},${artY}`);
}

await mkdir(outDir, { recursive: true });
for (const plate of plates) {
  if (!only || only === plate.slug) await buildPlate(plate);
}
