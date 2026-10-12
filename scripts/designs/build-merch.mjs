#!/usr/bin/env node
/**
 * PrintMe "Issue Nº 01" merch artwork builder.
 *
 * Produces original, print-ready artwork for the first creative-proof drop:
 *   make-shit-print-shit   ransom-note collage typography (streetwear)
 *   bad-ideas-club         distressed collegiate + marker scrawl (sarcastic)
 *   creature-of-habit      original one-eyed coffee monster (horror comedy)
 *
 * Every word is outlined from OFL fonts (no live text in print files). Each
 * design is written as:
 *   designs/source/<slug>.svg                 editable layered source
 *   public/designs/issue-01/<slug>.png        3951×4800 transparent print file
 *   public/designs/issue-01/<slug>.webp       988×1200 storefront preview
 *
 * Run: node scripts/designs/build-merch.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';
import { blob, halftone, palette, r2, rng, splatter, tape, tornRect } from '../brand/collage-kit.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const W = 3951;
const H = 4800;
const ACID = '#B8F23A';

function font(rel) {
  const buf = readFileSync(join(root, 'node_modules', '@fontsource', rel));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
const F = {
  archivo: font('archivo-black/files/archivo-black-latin-400-normal.woff'),
  slab: font('alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff'),
  anton: font('anton/files/anton-latin-400-normal.woff'),
  bowlby: font('bowlby-one/files/bowlby-one-latin-400-normal.woff'),
  marker: font('permanent-marker/files/permanent-marker-latin-400-normal.woff'),
  graduate: font('graduate/files/graduate-latin-400-normal.woff'),
  creepster: font('creepster/files/creepster-latin-400-normal.woff'),
};

/** Outline a string centred on (cx, baselineY), optionally fitted to maxWidth. */
function textPath(str, f, size, cx, baseline, { maxWidth, tracking = 0 } = {}) {
  let s = size;
  const width = (sz) => f.getAdvanceWidth(str, sz) + tracking * (str.length - 1);
  if (maxWidth && width(s) > maxWidth) s = (s * maxWidth) / width(s);
  let x = cx - width(s) / 2;
  const parts = [];
  for (const ch of str) {
    parts.push(f.getPath(ch, x, baseline, s).toPathData(1));
    x += f.getAdvanceWidth(ch, s) + tracking;
  }
  return { d: parts.join(''), size: s };
}

/** Outline text along a circular arc (top of circle), centred on angle -90°. */
function arcText(str, f, size, cx, cy, radius, tracking = 0) {
  const widths = [...str].map((ch) => f.getAdvanceWidth(ch, size) + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let angle = -Math.PI / 2 - total / radius / 2;
  const out = [];
  [...str].forEach((ch, i) => {
    const w = widths[i] - tracking;
    const mid = angle + w / 2 / radius;
    const x = cx + Math.cos(mid) * radius;
    const y = cy + Math.sin(mid) * radius;
    const d = f.getPath(ch, -w / 2, 0, size).toPathData(1);
    out.push(`<path d="${d}" transform="translate(${r2(x)} ${r2(y)}) rotate(${r2((mid * 180) / Math.PI + 90)})"/>`);
    angle += widths[i] / radius;
  });
  return out.join('');
}

/** Screen-print wear: speckles + scratches knocked out of the artwork. */
function distressMask(id, seed, density = 1, maxR = 16) {
  const rand = rng(seed);
  const holes = [];
  for (let i = 0; i < 900 * density; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 2 + rand() * rand() * maxR;
    holes.push(`M${r2(x - r)} ${r2(y)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(r * 2)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-r * 2)} 0`);
  }
  const scratches = [];
  for (let i = 0; i < 70 * density; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const len = 60 + rand() * 260;
    const a = (rand() - 0.5) * 0.5;
    scratches.push(`M${r2(x)} ${r2(y)}l${r2(Math.cos(a) * len)} ${r2(Math.sin(a) * len)}`);
  }
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><path d="${holes.join('')}" fill="#000"/><path d="${scratches.join('')}" stroke="#000" stroke-width="5" stroke-linecap="round"/></mask>`;
}

function svgDoc(title, body, defs = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<title>${title}</title>
<desc>PrintMe.ai Issue Nº 01 original artwork. Source: scripts/designs/build-merch.mjs. All text outlined from OFL fonts.</desc>
<defs>${defs}</defs>
${body}
</svg>
`;
}

/* ================================================================== */
/* 1. MAKE SHIT. PRINT SHIT.                                           */
/* ================================================================== */
function makeShitPrintShit() {
  const lines = ['MAKE', 'SHIT.', 'PRINT', 'SHIT.'];
  const fontsCycle = ['archivo', 'slab', 'bowlby', 'archivo', 'anton', 'archivo', 'slab'];
  const papers = [palette.paper, palette.yellow, palette.newsprint, palette.pink, palette.photocopy, palette.paper, 'invert'];
  const size = 760;
  const rowH = 820;
  const top = 560;
  let n = 0;
  const rand = rng(2026);
  const rows = [];
  lines.forEach((line, li) => {
    const pieces = [];
    let x = 0;
    for (const ch of line) {
      const fk = ch === '.' ? 'archivo' : fontsCycle[(n * 3 + li) % fontsCycle.length];
      const f = F[fk];
      const sz = size * (fk === 'anton' ? 1.12 : 1);
      if (ch === '.') {
        const rr = 74;
        pieces.push({ x, w: rr * 2 + 30, dot: blob(rr + 15, rowH - 190, rr, 300 + n, 0.2) });
        x += rr * 2 + 30;
        n++;
        continue;
      }
      const bb = f.getPath(ch, 0, 0, sz).getBoundingBox();
      const padX = 46 + rand() * 30;
      const w = bb.x2 - bb.x1 + padX * 2;
      const h = Math.max(bb.y2 - bb.y1 + 90, rowH - 60);
      const paper = papers[(n * 5 + li * 2) % papers.length];
      const tx = padX - bb.x1;
      const ty = (h - (bb.y2 - bb.y1)) / 2 - bb.y1;
      pieces.push({
        x, w, h, paper,
        rot: (rand() - 0.5) * 7,
        grot: (rand() - 0.5) * 6,
        scrap: tornRect(w, h, 1000 + n * 17, { rough: 7, step: 22 }),
        glyph: f.getPath(ch, tx, ty, sz).toPathData(1),
      });
      x += w - 22;
      n++;
    }
    rows.push({ pieces, width: x });
  });
  const maxRow = Math.max(...rows.map((r) => r.width));
  const scale = Math.min(1, 3500 / maxRow);
  const parts = [];
  rows.forEach((row, li) => {
    const ox = (W - row.width * scale) / 2 + (li % 2 ? 60 : -60) * scale;
    const oy = top + li * rowH * 0.97;
    parts.push(`<g id="line-${li + 1}" transform="translate(${r2(ox)} ${r2(oy)}) scale(${r2(scale)})">`);
    for (const p of row.pieces) {
      if (p.dot) {
        parts.push(`<path data-layer="dot" d="${p.dot}" transform="translate(${r2(p.x)} 0)" fill="${palette.pink}" stroke="${palette.ink}" stroke-width="16"/>`);
        continue;
      }
      const cx = r2(p.w / 2), cy = r2(p.h / 2);
      const invert = p.paper === 'invert';
      parts.push(`<g transform="translate(${r2(p.x)} 0) rotate(${r2(p.rot)} ${cx} ${cy})">`);
      parts.push(`<path data-layer="paper" d="${p.scrap}" fill="${invert ? palette.ink : p.paper}" stroke="${palette.ink}" stroke-width="16" stroke-linejoin="round"/>`);
      parts.push(`<path data-layer="glyph" d="${p.glyph}" transform="rotate(${r2(p.grot)} ${cx} ${cy})" fill="${invert ? palette.paper : palette.ink}"/>`);
      parts.push('</g>');
    }
    parts.push('</g>');
  });
  const backing = `<g id="backing" transform="translate(180 ${top - 160}) rotate(-2.5 1800 1700)"><path d="${tornRect(3600, rowH * 4 + 220, 777, { rough: 16, step: 46 })}" fill="${palette.ink}"/></g>`;
  const deco = [
    `<path id="halftone" d="${halftone(3250, 700, 1300, 1100, 31, { pitch: 64, max: 26 })}" fill="${palette.pink}"/>`,
    `<path id="halftone-2" d="${halftone(560, 3700, 1100, 900, 32, { pitch: 64, max: 24 })}" fill="${palette.yellow}"/>`,
    `<path id="tape-1" d="${tape(620, 170, 41)}" transform="translate(230 420) rotate(-24)" fill="${palette.newsprint}" fill-opacity=".9" stroke="${palette.ink}" stroke-width="10"/>`,
    `<path id="tape-2" d="${tape(560, 160, 42)}" transform="translate(3250 3780) rotate(-18)" fill="${palette.pink}" stroke="${palette.ink}" stroke-width="10"/>`,
    `<path id="splatter" d="${splatter(3600, 4110, 90, 51)}" fill="${palette.ink}"/>`,
  ];
  const foot = textPath('PRINTME.AI — ISSUE Nº 01 — NO PERMISSION REQUIRED', F.archivo, 120, W / 2, 4520, { maxWidth: 3300, tracking: 8 });
  const body = `<g mask="url(#wear)">${deco.slice(0, 2).join('')}${backing}${parts.join('')}${deco.slice(2).join('')}<path id="footer-microtype" d="${foot.d}" fill="${palette.ink}"/></g>`;
  return svgDoc('MAKE SHIT. PRINT SHIT. — PrintMe.ai', body, distressMask('wear', 9, 0.45, 9));
}

/* ================================================================== */
/* 2. BAD IDEAS CLUB                                                   */
/* ================================================================== */
function badIdeasClub() {
  const cx = W / 2;
  // crescent is a masked circle: no white ink, so it prints correctly on any blank
  const moon = `<g id="moon" mask="url(#crescent-cut)"><circle cx="${cx}" cy="1900" r="980" fill="${palette.pink}"/><g clip-path="url(#crescent)"><path d="${halftone(cx - 520, 2250, 1500, 1400, 77, { pitch: 70, max: 30 })}" fill="${palette.ink}" opacity=".85"/></g></g>`;
  const moonDots = '';
  const arc = `<g id="arc-bad-ideas" fill="${palette.ink}" stroke="${palette.ink}" stroke-width="10">${arcText('BAD IDEAS', F.graduate, 560, cx, 2620, 1850, 22)}</g>`;
  const club = textPath('CLUB', F.graduate, 1180, cx, 3080, { maxWidth: 3500, tracking: 40 });
  const clubShadow = `<path d="${club.d}" transform="translate(34 34)" fill="${palette.pink}"/>`;
  const est = textPath('EST. 3AM', F.archivo, 230, cx, 3480, { tracking: 26 });
  const estHalf = (F.archivo.getAdvanceWidth('EST. 3AM', 230) + 26 * 7) / 2;
  const star = (x, y, r) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      pts.push(`${r2(x + Math.cos(a) * rr)} ${r2(y + Math.sin(a) * rr)}`);
    }
    return `M${pts.join('L')}Z`;
  };
  const stars = `<path id="stars" d="${star(cx - estHalf - 190, 3400, 95)}${star(cx + estHalf + 190, 3400, 95)}" fill="${palette.pink}" stroke="${palette.ink}" stroke-width="14" stroke-linejoin="round"/>`;
  const members = textPath('MEMBERS ONLY · NO REFUNDS', F.archivo, 150, cx, 3740, { tracking: 34 });
  const scrawl1 = textPath('no regrets', F.marker, 330, 0, 0);
  const scrawl2 = textPath('(some regrets)', F.marker, 270, 0, 0);
  const scrawl = `<g id="marker-scrawl" fill="${palette.pink}" stroke="${palette.ink}" stroke-width="10" paint-order="stroke">
<path d="${scrawl1.d}" transform="translate(1650 4330) rotate(-6)"/>
<path d="${scrawl2.d}" transform="translate(2250 4640) rotate(-5)"/></g>`;
  const arrow = `<path id="scribble-arrow" d="M3140 4560 C3640 4470 3830 4020 3770 3300 M3770 3300 l-100 130 M3770 3300 l90 130" fill="none" stroke="${palette.ink}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`;
  const underline = `<path id="underline" d="M640 3900 C1300 3830 2300 3990 3330 3860" fill="none" stroke="${palette.pink}" stroke-width="56" stroke-linecap="round"/>`;
  const defs = `<mask id="crescent-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="${cx + 430}" cy="1640" r="860" fill="#000"/></mask><clipPath id="crescent"><path d="M${cx - 980} 1900a980 980 0 1 0 1960 0a980 980 0 1 0 -1960 0Z"/></clipPath>${distressMask('wear', 21, 1.1)}`;
  const body = `<g mask="url(#wear)">${moon}${moonDots}${arc}${clubShadow}<path id="club" d="${club.d}" fill="${palette.ink}"/>${underline}<path id="est" d="${est.d}" fill="${palette.ink}"/>${stars}<path id="members" d="${members.d}" fill="${palette.ink}"/>${arrow}${scrawl}</g>`;
  return svgDoc('BAD IDEAS CLUB — EST. 3AM — PrintMe.ai', body, defs);
}

/* ================================================================== */
/* 3. CREATURE OF HABIT                                                */
/* ================================================================== */
function furBody(cx, cy, rx, ry, seed) {
  const rand = rng(seed);
  const n = 64;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const tuft = i % 2 ? 1.045 + rand() * 0.03 : 0.975 - rand() * 0.02;
    pts.push([cx + Math.cos(a) * rx * tuft, cy + Math.sin(a) * ry * tuft]);
  }
  return 'M' + pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L') + 'Z';
}

function creatureOfHabit() {
  const ink = palette.ink;
  const S = 3.2; // monster drawn in a 1000-unit space, scaled up
  const ox = W / 2 - 500 * S;
  const oy = 980;
  const sw = 16;
  const m = [];
  // goo drips under the body
  m.push(`<path id="goo" d="M300 790 q20 120 40 0 M610 800 q24 170 48 0 M470 812 q16 80 32 0" fill="${ACID}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`);
  // horns
  m.push(`<g id="horns" fill="${palette.newsprint}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round">
<path d="M290 300 C200 220 190 110 250 40 C260 140 320 200 380 230 Z"/>
<path d="M710 300 C800 220 810 110 750 40 C740 140 680 200 620 230 Z"/></g>`);
  // feet
  m.push(`<g id="feet" fill="${palette.orange}" stroke="${ink}" stroke-width="${sw}"><ellipse cx="380" cy="850" rx="90" ry="48"/><ellipse cx="620" cy="850" rx="90" ry="48"/></g>`);
  // body
  const bodyShape = furBody(500, 520, 330, 320, 88);
  m.push(`<path id="body" d="${bodyShape}" fill="${palette.orange}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>`);
  m.push(`<clipPath id="bodyclip"><path d="${bodyShape}"/></clipPath>`);
  m.push(`<g id="body-shading" clip-path="url(#bodyclip)"><path d="${halftone(330, 740, 700, 520, 99, { pitch: 26, max: 10 })}" fill="${ink}" opacity=".9"/></g>`);
  // eye
  m.push(`<g id="eye">
<circle cx="500" cy="380" r="138" fill="#fff" stroke="${ink}" stroke-width="${sw}"/>
<path d="M378 330 l40 22 M392 448 l46 -18 M610 300 l-40 30 M628 420 l-44 -6" stroke="${palette.pink}" stroke-width="7" stroke-linecap="round"/>
<circle cx="520" cy="402" r="66" fill="${ACID}" stroke="${ink}" stroke-width="10"/>
<circle cx="526" cy="408" r="32" fill="${ink}"/>
<circle cx="544" cy="388" r="11" fill="#fff"/>
<path d="M362 380 A138 138 0 0 1 638 380 Q500 330 362 380Z" fill="${palette.orange}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>
<path d="M405 545 Q500 575 595 545" fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round"/></g>`);
  // grin: teeth hang from the top lip curve, acid tongue below
  const lip = (t) => {
    const [x0, y0, cx1, cy1, x1, y1] = [300, 612, 500, 680, 700, 600];
    return [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx1 + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy1 + t * t * y1];
  };
  const teeth = [];
  for (let i = 0; i < 9; i++) {
    const [ax, ay] = lip(0.1 + i * 0.09);
    const [bx, by] = lip(0.1 + (i + 1) * 0.09);
    const mx = (ax + bx) / 2;
    teeth.push(`M${r2(ax)} ${r2(ay)}L${r2(mx)} ${r2((ay + by) / 2 + (i % 3 === 1 ? 58 : 42))}L${r2(bx)} ${r2(by)}Z`);
  }
  m.push(`<g id="grin"><path d="M300 612 Q500 820 700 600 Q500 680 300 612Z" fill="${ink}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>
<path d="M430 718 Q520 676 610 706 Q560 748 480 742Z" fill="${ACID}"/>
<path d="${teeth.join('')}" fill="${palette.newsprint}" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/></g>`);
  // arm + mug
  m.push(`<g id="mug">
<path d="M770 520 Q880 560 880 640" fill="none" stroke="${ink}" stroke-width="58" stroke-linecap="round"/>
<path d="M770 520 Q880 560 880 640" fill="none" stroke="${palette.orange}" stroke-width="30" stroke-linecap="round"/>
<path d="M968 640 q70 0 70 70 q0 70 -70 70" fill="none" stroke="${ink}" stroke-width="22"/>
<rect x="800" y="610" width="176" height="200" rx="18" fill="${palette.newsprint}" stroke="${ink}" stroke-width="${sw}"/>
<rect x="800" y="640" width="176" height="44" fill="${palette.pink}" stroke="${ink}" stroke-width="8"/>
<path d="M840 590 q-30 -50 0 -100 q30 -50 0 -100 M900 580 q-26 -46 0 -92 q26 -46 0 -92" fill="none" stroke="${ink}" stroke-width="13" stroke-linecap="round"/></g>`);
  m.push(`<path id="left-arm" d="M232 560 Q120 600 140 700" fill="none" stroke="${ink}" stroke-width="58" stroke-linecap="round"/><path d="M232 560 Q120 600 140 700" fill="none" stroke="${palette.orange}" stroke-width="30" stroke-linecap="round"/>`);
  const mugText = textPath('#1', F.archivo, 74, 888, 770);
  m.push(`<path id="mug-text" d="${mugText.d}" fill="${ink}"/>`);

  const clip = m.find((x) => x.startsWith('<clipPath'));
  const monster = m.filter((x) => x !== clip).join('');

  const title = textPath('CREATURE', F.creepster, 980, W / 2, 900, { maxWidth: 3700, tracking: 10 });
  const titleShadow = `<path d="${title.d}" transform="translate(38 30)" fill="${palette.pink}"/>`;
  const of = textPath('OF HABIT', F.bowlby, 520, 0, 0, { tracking: 10 });
  const scrapW = 2700;
  const plate = `<g id="of-habit" transform="translate(${(W - scrapW) / 2} 3880) rotate(-2.5 ${scrapW / 2} 330)">
<path d="${tornRect(scrapW, 660, 404, { rough: 12, step: 40 })}" fill="${ACID}" stroke="${ink}" stroke-width="20"/>
<path d="${of.d}" transform="translate(${scrapW / 2} 520)" fill="${ink}"/></g>`;
  const tag = textPath('RUNS ON COFFEE & SPITE', F.marker, 190, 0, 0);
  const tagEl = `<path id="scrawl" d="${tag.d}" transform="translate(${W / 2 + 60} 4740) rotate(-3)" fill="${ink}"/>`;
  const splat = `<path d="${splatter(470, 1300, 120, 61)}" fill="${ACID}"/><path d="${splatter(3500, 3000, 90, 62)}" fill="${palette.pink}"/>`;

  const defs = `${clip.replace('<clipPath id="bodyclip">', `<clipPath id="bodyclip" clipPathUnits="userSpaceOnUse">`)}${distressMask('wear', 33, 0.9)}`;
  const body = `<g mask="url(#wear)">${splat}<g id="title" fill="${ink}">${titleShadow}<path d="${title.d}"/></g><g id="monster" transform="translate(${r2(ox)} ${oy}) scale(${S})">${monster}</g>${plate}${tagEl}</g>`;
  return svgDoc('CREATURE OF HABIT — PrintMe.ai', body, defs);
}

/* ================================================================== */
const designs = {
  'make-shit-print-shit': makeShitPrintShit(),
  'bad-ideas-club': badIdeasClub(),
  'creature-of-habit': creatureOfHabit(),
};

mkdirSync(join(root, 'designs', 'source'), { recursive: true });
mkdirSync(join(root, 'public', 'designs', 'issue-01'), { recursive: true });
for (const [slug, svg] of Object.entries(designs)) {
  writeFileSync(join(root, 'designs', 'source', `${slug}.svg`), svg);
  const png = await sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(join(root, 'public', 'designs', 'issue-01', `${slug}.png`), png);
  await sharp(png).resize(988, 1200).webp({ quality: 88, alphaQuality: 100 }).toFile(join(root, 'public', 'designs', 'issue-01', `${slug}.webp`));
  const meta = await sharp(png).metadata();
  console.log(slug, `${meta.width}x${meta.height}`, `${(png.length / 1024).toFixed(0)} KB`, meta.hasAlpha ? 'alpha' : 'opaque');
}
