#!/usr/bin/env node
// Builds the Q4 2026 PrintMe drop: seven original designs, each sized to its
// product's Printify print area, with all type set in code from OFL fonts.
//
//   node scripts/designs/build-q4-drops.mjs [--only slug] [--out public/designs/q4-2026]
//
// Illustrations: generated for PrintMe with Figma AI (text-only prompts, see
// sources/README.md), upscaled 4x with Cloudinary e_upscale (upscale.mjs) and
// keyed by lib/engraving.mjs#keyIllustration. The robot stencil is made from
// the PrintMe mascot cutout (public/mascot/robot-skate.webp).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { keyIllustration } from './lib/engraving.mjs';
import { stencil } from './lib/stencil.mjs';
import { arcText, capHeight, loadFont, sizeToWidth, textPath } from './lib/outlined-type.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const outDir = path.resolve(arg('--out') ?? 'public/designs/q4-2026');
const only = arg('--only');
const font = (file) => loadFont(path.join(here, 'fonts', file));
const src = (name) => path.join(here, 'sources', 'upscaled', name);

const F = {
  graduate: font('Graduate-Regular.ttf'),
  shrikhand: font('Shrikhand-Regular.ttf'),
  fraktur: font('UnifrakturCook-Bold.ttf'),
  blackOps: font('BlackOpsOne-Regular.ttf'),
  rubikMono: font('RubikMonoOne-Regular.ttf'),
  caveat: font('CaveatBrush-Regular.ttf'),
  anton: font('Anton-Regular.ttf'),
  mono: font('SpaceMono-Bold.ttf'),
};

/** Font size so `text` spans `sweep` radians of an arc with `radius`. */
const arcSize = (f, text, radius, sweep, tracking) => sizeToWidth(f, text, radius * sweep, tracking);
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const pathEl = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const fit = async (layer, maxW, maxH) => {
  const scale = Math.min(maxW / layer.width, maxH / layer.height);
  const width = Math.round(layer.width * scale);
  const height = Math.round(layer.height * scale);
  return { png: await sharp(layer.png).resize(width, height, { kernel: 'lanczos3' }).png().toBuffer(), width, height };
};
async function canvas(w, h, layers) {
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toBuffer();
}

const designs = {
  /** Thanksgiving game-day vintage mascot, Gildan 18000 crewneck front 3852×4398. */
  async 'second-helping-athletics'() {
    const W = 3852, H = 4398;
    const navy = '#1d2b53', gold = '#e3a524';
    const art = await fit(await keyIllustration(src('turkey-mascot.jpg'), { mode: 'silhouette' }), 2700, 2500);
    const radius = 2600;
    const arcFont = Math.min(430, arcSize(F.graduate, 'SECOND HELPING', radius, 1.18, 0.04));
    const arc = (fill, dy) => arcText(F.graduate, 'SECOND HELPING', { cx: W / 2, cy: 3080 + dy, radius, size: arcFont, tracking: 0.04, fill }).svg;
    const word = 'ATHLETICS';
    const size = sizeToWidth(F.graduate, word, W * 0.84, 0.03);
    const base = 3980;
    const athletics = (fill, dy) => pathEl(textPath(F.graduate, word, { x: W / 2, y: base + dy, size, tracking: 0.03, align: 'center' }).d, fill);
    const small = textPath(F.graduate, 'TURKEY BOWL DIVISION  ·  EST. 4TH THURSDAY', { x: W / 2, y: H - 70, size: 128, tracking: 0.08, align: 'center' });
    const type = svg(W, H, `${arc(gold, 30)}${arc(navy, 0)}${athletics(gold, 30)}${athletics(navy, 0)}${pathEl(small.d, navy)}`);
    return [{ name: 'front', width: W, height: H, png: await canvas(W, H, [{ input: art.png, left: Math.round((W - art.width) / 2), top: 760 }, { input: type, left: 0, top: 0 }]) }];
  },

  /** Cozy-season mug: one handle-safe side, 1275×1155, used on both sides of the wrap. */
  async 'soup-of-the-day'() {
    const W = 1275, H = 1155;
    const brown = '#4a2a18', orange = '#d4561c';
    const art = await fit(await keyIllustration(src('soup-bowl.jpg'), { mode: 'silhouette' }), 760, 640);
    const top = textPath(F.mono, 'SOUP OF THE DAY:', { x: W / 2, y: 120, size: 78, tracking: 0.12, align: 'center' });
    const size = sizeToWidth(F.shrikhand, 'all  of  them', W * 0.9, 0.05);
    const bottom = textPath(F.shrikhand, 'all  of  them', { x: W / 2, y: H - 70, size, tracking: 0.05, align: 'center' });
    const type = svg(W, H, `${pathEl(top.d, brown)}${pathEl(bottom.d, orange, ` stroke="${brown}" stroke-width="10" stroke-linejoin="round" paint-order="stroke"`)}`);
    return [{ name: 'side', width: W, height: H, png: await canvas(W, H, [{ input: art.png, left: Math.round((W - art.width) / 2), top: 170 }, { input: type, left: 0, top: 0 }]) }];
  },

  /** Pet-parent Christmas line art, BC3001 Natural, 3951×4800. */
  async 'supervising-the-decorations'() {
    const W = 3951, H = 4800;
    const green = '#1f4d36', red = '#c4362b';
    const art = await fit(await keyIllustration(src('dog-lights.jpg'), { mode: 'lineart', boldLines: 5 }), 3200, 3560);
    const a = 'Supervising';
    const sizeA = sizeToWidth(F.caveat, a, W * 0.8, 0.01);
    const lineA = textPath(F.caveat, a, { x: W / 2, y: 120 + capHeight(F.caveat, sizeA), size: sizeA, tracking: 0.01, align: 'center' });
    const b = 'the decorations';
    const sizeB = sizeToWidth(F.caveat, b, W * 0.72, 0.01);
    const lineB = textPath(F.caveat, b, { x: W / 2, y: H - 90, size: sizeB, tracking: 0.01, align: 'center' });
    const type = svg(W, H, `${pathEl(lineA.d, green)}${pathEl(lineB.d, red)}`);
    const top = Math.round(120 + capHeight(F.caveat, sizeA) + 120);
    return [{ name: 'front', width: W, height: H, png: await canvas(W, H, [{ input: art.png, left: Math.round((W - art.width) / 2), top }, { input: type, left: 0, top: 0 }]) }];
  },

  /** Faux band tour tee for readers, BC3001 Black, front + back 3951×4800. */
  async 'one-more-chapter-tour'() {
    const W = 3951, H = 4800;
    const ink = '#f2ecde', blood = '#c23a2c';
    const art = await fit(await keyIllustration(src('skeleton-reader.jpg'), { mode: 'knockout' }), 2700, 2900);
    const radius = 2700;
    const arcFont = Math.min(560, arcSize(F.fraktur, 'One More Chapter', radius, 1.2, 0.01));
    const arc = arcText(F.fraktur, 'One More Chapter', { cx: W / 2, cy: 3200, radius, size: arcFont, tracking: 0.01, fill: ink }).svg;
    const tourSize = sizeToWidth(F.anton, 'WORLD TOUR', W * 0.62, 0.18);
    const tour = textPath(F.anton, 'WORLD TOUR', { x: W / 2, y: H - 380, size: tourSize, tracking: 0.18, align: 'center' });
    const year = textPath(F.mono, '2026  ·  NO REFUNDS ON LOST SLEEP', { x: W / 2, y: H - 120, size: 120, tracking: 0.1, align: 'center' });
    const front = svg(W, H, `${arc}${pathEl(tour.d, ink)}${pathEl(year.d, blood)}`);
    const frontPng = await canvas(W, H, [{ input: art.png, left: Math.round((W - art.width) / 2), top: 980 }, { input: front, left: 0, top: 0 }]);

    const dates = [
      ['CH. 01', 'THE COUCH', 'SOLD OUT'],
      ['CH. 02', 'THE BATHTUB', 'SOLD OUT'],
      ['CH. 03', 'DENTIST WAITING ROOM', 'SOLD OUT'],
      ['CH. 04', 'BED, 2:47 A.M.', 'SOLD OUT'],
      ['CH. 05', '"JUST ONE MORE"', 'SOLD OUT'],
      ['CH. 06', 'WORK TOMORROW', 'CANCELLED'],
    ];
    const head = textPath(F.fraktur, 'The One More Chapter Tour', { x: W / 2, y: 520, size: 330, tracking: 0, align: 'center' });
    let rows = '';
    const venueX = 1020;
    const statusW = 760;
    dates.forEach(([ch, venue, status], i) => {
      const y = 1200 + i * 560;
      rows += pathEl(textPath(F.anton, ch, { x: 260, y, size: 230, tracking: 0.05 }).d, blood);
      const venueSize = Math.min(260, sizeToWidth(F.anton, venue, W - 260 - statusW - venueX - 60, 0.03));
      rows += pathEl(textPath(F.anton, venue, { x: venueX, y, size: venueSize, tracking: 0.03 }).d, ink);
      rows += pathEl(textPath(F.mono, status, { x: W - 260, y: y - 50, size: 110, tracking: 0.12, align: 'right' }).d, status === 'CANCELLED' ? blood : ink);
      rows += `<rect x="260" y="${y + 130}" width="${W - 520}" height="8" fill="${ink}" opacity="0.35"/>`;
    });
    const back = svg(W, H, `${pathEl(head.d, ink)}${rows}`);
    return [
      { name: 'front', width: W, height: H, png: frontPng },
      { name: 'back', width: W, height: H, png: await canvas(W, H, [{ input: back, left: 0, top: 0 }]) },
    ];
  },

  /** PrintMe mascot brand hoodie, Gildan 18500 Black, front 3531×2352. */
  async 'made-by-machines'() {
    const W = 3531, H = 2352;
    const ink = '#f2ecde', pink = '#ff2b91';
    const robot = await stencil(path.join(root, 'public/mascot/robot-skate.webp'), { height: 2100, threshold: 110 });
    const left = 40;
    const textX = left + robot.width + 90;
    const avail = W - textX - 40;
    const lines = [
      ['MADE BY', ink],
      ['MACHINES.', ink],
      ['APPROVED BY', pink],
      ['NOBODY.', pink],
    ];
    const size = Math.min(...lines.map(([t]) => sizeToWidth(F.blackOps, t, avail, 0.02)));
    let y = 330 + capHeight(F.blackOps, size);
    let body = '';
    for (const [text, colour] of lines) {
      body += pathEl(textPath(F.blackOps, text, { x: textX, y, size, tracking: 0.02 }).d, colour);
      y += size * 1.02;
    }
    const tagSize = Math.min(110, sizeToWidth(F.mono, 'PRINTME.AI  ·  UNIT 001', avail, 0.14));
    body += pathEl(textPath(F.mono, 'PRINTME.AI  ·  UNIT 001', { x: textX, y: y + 40, size: tagSize, tracking: 0.14 }).d, ink);
    return [{ name: 'front', width: W, height: H, png: await canvas(W, H, [{ input: robot.png, left, top: Math.round((H - robot.height) / 2) }, { input: svg(W, H, body), left: 0, top: 0 }]) }];
  },

  /** Capybara risograph, BC3001 Heather Navy, 3951×4800. */
  async 'low-power-mode'() {
    const W = 3951, H = 4800;
    const pink = '#ff86c8', teal = '#5fd6c8';
    const art = await fit(await keyIllustration(src('capybara-spring.jpg'), { mode: 'silhouette' }), 3300, 2900);
    const title = 'LOW POWER MODE';
    const size = sizeToWidth(F.rubikMono, title, W * 0.88, 0.02);
    const titleBase = 760;
    const t = textPath(F.rubikMono, title, { x: W / 2, y: titleBase, size, tracking: 0.02, align: 'center' });
    // Battery icon at 3%.
    const bw = 620, bh = 280, bx = (W - bw) / 2, by = 110;
    const battery = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="60" fill="none" stroke="${pink}" stroke-width="44"/>
      <rect x="${bx + bw + 22}" y="${by + 80}" width="60" height="120" rx="20" fill="${pink}"/>
      <rect x="${bx + 64}" y="${by + 64}" width="70" height="${bh - 128}" rx="16" fill="#ff5a5a"/>`;
    const sub = textPath(F.mono, 'DO NOT DISTURB  ·  CURRENTLY SOAKING', { x: W / 2, y: H - 110, size: 150, tracking: 0.08, align: 'center' });
    const type = svg(W, H, `${battery}${pathEl(t.d, pink)}${pathEl(sub.d, teal)}`);
    return [{ name: 'front', width: W, height: H, png: await canvas(W, H, [{ input: art.png, left: Math.round((W - art.width) / 2), top: titleBase + 220 }, { input: type, left: 0, top: 0 }]) }];
  },

  /** Retro horror Christmas poster, 12×18 in at 300 ppi (3600×5400). */
  async 'he-saw-the-group-chat'() {
    const W = 3600, H = 5400;
    const paper = '#15100e', bone = '#efe6d2', red = '#c8242b';
    const artH = Math.round((W / 3584) * 4800);
    const art = await sharp(src('krampus-poster.jpg')).resize(W, artH, { kernel: 'lanczos3' }).png().toBuffer();
    const tag = textPath(F.mono, 'THIS DECEMBER, NOBODY IS ON THE NICE LIST.', { x: W / 2, y: 190, size: 96, tracking: 0.08, align: 'center' });
    const titleSize = sizeToWidth(F.anton, 'HE SAW THE GROUP CHAT.', W * 0.9, 0.01);
    const title = textPath(F.anton, 'HE SAW THE GROUP CHAT.', { x: W / 2, y: H - 230, size: titleSize, tracking: 0.01, align: 'center' });
    const credit = textPath(F.mono, 'A PRINTME.AI HOLIDAY NIGHTMARE  ·  RATED NAUGHTY', { x: W / 2, y: H - 90, size: 78, tracking: 0.1, align: 'center' });
    const overlay = svg(W, H, `
      <defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paper}" stop-opacity="0"/><stop offset="1" stop-color="${paper}"/></linearGradient></defs>
      <rect x="0" y="${artH - 700}" width="${W}" height="700" fill="url(#fade)"/>
      <rect x="0" y="0" width="${W}" height="300" fill="${paper}" opacity="0.82"/>
      ${pathEl(tag.d, bone)}<g transform="translate(16 16)">${pathEl(title.d, red)}</g>${pathEl(title.d, bone)}${pathEl(credit.d, bone)}`);
    const png = await sharp({ create: { width: W, height: H, channels: 4, background: paper } })
      .composite([{ input: art, left: 0, top: 120 }, { input: overlay, left: 0, top: 0 }])
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    return [{ name: 'print', width: W, height: H, png }];
  },
};

await mkdir(outDir, { recursive: true });
for (const [slug, build] of Object.entries(designs)) {
  if (only && only !== slug) continue;
  const files = await build();
  // Back prints need multi-position design support in the catalog; they are kept
  // out of public/ until then (opt in with --with-back).
  const shipped = process.argv.includes('--with-back') ? files : files.filter((file) => file.name !== 'back');
  for (const file of shipped) {
    const base = shipped.length === 1 ? slug : `${slug}-${file.name}`;
    await writeFile(path.join(outDir, `${base}.png`), file.png);
    await sharp(file.png).resize({ width: 1200, height: 1200, fit: 'inside' }).webp({ quality: 88 }).toFile(path.join(outDir, `${base}.webp`));
    console.log(`${base}: ${file.width}x${file.height}`);
  }
}
