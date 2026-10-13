#!/usr/bin/env node
/**
 * PrintMe.ai collage logo builder.
 *
 * Reconstructs the approved punk cut-and-paste reference
 * (brand/references/printme-punk-collage-logo-reference.png) as real vector
 * artwork. Letterforms are outlined from OFL-licensed fonts (Archivo Black,
 * Alfa Slab One, Anton, Bowlby One via @fontsource) so every lockup spells
 * "PrintMe.ai" exactly. Torn edges, rotations, tape, splatter and halftone are
 * generated from fixed seeds: the irregularity is designed and repeatable, not
 * traced from the low-resolution reference.
 *
 * Outputs (all regenerated on every run):
 *   brand/logo/*.svg                 production lockups
 *   brand/applications/*.svg         label / packaging / social / email usage
 *   lib/brand/logo-layers.json       layer data consumed by <CollageLogo />
 *   public/brand/*.svg               web copies of the lockups
 *   app/icon.svg                     favicon (Next.js file convention)
 *
 * Run: node scripts/brand/build-logo.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const fontsDir = join(root, 'node_modules', '@fontsource');

const fonts = {
  archivo: opentype.parse(readBuffer('archivo-black/files/archivo-black-latin-400-normal.woff')),
  slab: opentype.parse(readBuffer('alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff')),
  anton: opentype.parse(readBuffer('anton/files/anton-latin-400-normal.woff')),
  bowlby: opentype.parse(readBuffer('bowlby-one/files/bowlby-one-latin-400-normal.woff')),
};

function readBuffer(rel) {
  const buf = readFileSync(join(fontsDir, rel));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

import { blob, halftone, palette, r2, rng, splatter, tape, tornRect } from './collage-kit.mjs';

export { palette };

/* ------------------------------------------------------------------ */
/* Letter scraps                                                       */
/* ------------------------------------------------------------------ */
const SIZE = 210;

/**
 * Art direction per character. Typeface, paper, rotation and padding are
 * chosen by hand to echo the reference: mostly heavy grotesk, one slab, one
 * condensed, paper alternating newsprint / photocopy / riot yellow / punk
 * pink so the word reads first and the collage second.
 */
const letters = {
  P: { font: 'archivo', paper: 'paper', rot: -3.2, glyphRot: 1.5, pad: [22, 18], seed: 11, tape: true },
  r: { font: 'slab', paper: 'yellow', rot: 2.4, glyphRot: -2, pad: [16, 30], seed: 23 },
  i: { font: 'archivo', paper: 'ink', invert: true, rot: -1.6, glyphRot: 2.5, pad: [16, 16], seed: 37 },
  n: { font: 'bowlby', paper: 'newsprint', rot: 3.1, glyphRot: -1, pad: [14, 22], seed: 41 },
  t: { font: 'archivo', paper: 'photocopy', rot: -2.6, glyphRot: 3, pad: [16, 14], seed: 53, halftone: true },
  M: { font: 'archivo', paper: 'pink', rot: 1.4, glyphRot: -1.5, pad: [18, 18], seed: 61, scale: 1.04 },
  e: { font: 'slab', paper: 'pink', rot: -2.2, glyphRot: 2, pad: [14, 26], seed: 73 },
  '.': { font: 'archivo', paper: null, rot: 0, glyphRot: 0, pad: [6, 0], seed: 79 },
  a: { font: 'anton', paper: 'newsprint', rot: 2.8, glyphRot: -2.5, pad: [14, 22], seed: 83, scale: 1.12 },
  I: { char: 'i', font: 'archivo', paper: 'paper', rot: -3.4, glyphRot: 1, pad: [14, 14], seed: 97 },
};

function makePiece(key, index) {
  const spec = letters[key];
  const ch = spec.char ?? key;
  const font = fonts[spec.font];
  const size = SIZE * (spec.scale ?? 1);
  if (key === '.') {
    const r = SIZE * 0.1;
    return { id: `dot-${index}`, char: '.', w: r2(r * 2 + 12), h: r2(r * 2), rot: 0, glyphRot: 0, paper: null, scrap: null,
      glyph: blob(r + 6, r, r, spec.seed, 0.18), tape: null, halftone: null };
  }
  const path = font.getPath(ch, 0, 0, size);
  const bb = path.getBoundingBox();
  const gw = bb.x2 - bb.x1;
  const gh = bb.y2 - bb.y1;
  const [px, py] = spec.pad;
  const minH = SIZE * 0.86;
  const w = gw + px * 2;
  const h = Math.max(gh + py * 2, spec.paper ? minH : 0);
  // translate glyph so its bbox is centred in the scrap
  const tx = px - bb.x1;
  const ty = (h - gh) / 2 - bb.y1;
  const glyph = font.getPath(ch, tx, ty, size).toPathData(2);
  return {
    id: `${key === '.' ? 'dot' : ch}-${index}`,
    char: ch,
    w: r2(w),
    h: r2(h),
    rot: spec.rot,
    glyphRot: spec.glyphRot,
    paper: spec.paper,
    invert: Boolean(spec.invert),
    scrap: spec.paper ? tornRect(w, h, spec.seed, { rough: 2.6, step: 8 }) : null,
    glyph,
    tape: spec.tape ? { d: tape(70, 26, spec.seed + 5), x: -18, y: -10, rot: -28 } : null,
    halftone: spec.halftone ? halftone(w * 0.5, h * 0.62, w * 1.2, h * 0.9, spec.seed, { pitch: 7, max: 2.6 }) : null,
  };
}

/** Lay pieces out on a baseline with deliberate overlaps and drift. */
function layoutRow(keys, startIndex, { overlap = -10, drift = 10, seed = 1 } = {}) {
  const rand = rng(seed);
  let x = 0;
  const placed = [];
  keys.forEach((key, i) => {
    const piece = makePiece(key, startIndex + i);
    const dy = (rand() - 0.5) * drift * 2;
    const y = key === '.' ? SIZE * 0.86 - piece.h - SIZE * 0.1 : dy + (SIZE * 0.86 - piece.h) / 2;
    placed.push({ ...piece, x: r2(x), y: r2(y) });
    x += piece.w + (key === '.' ? -2 : overlap);
  });
  return { pieces: placed, width: x - overlap };
}

function bounds(pieces) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const p of pieces) {
    x1 = Math.min(x1, p.x);
    y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x + p.w);
    y2 = Math.max(y2, p.y + p.h);
  }
  return { x1, y1, x2, y2 };
}

function stackedLayout() {
  const top = layoutRow(['P', 'r', 'i', 'n', 't'], 0, { seed: 5, overlap: -8 });
  const bottom = layoutRow(['M', 'e', '.', 'a', 'I'], 5, { seed: 9, overlap: -12 });
  const shift = (top.width - bottom.width) / 2 + 14;
  const rowGap = SIZE * 0.9;
  const pieces = [
    ...top.pieces,
    ...bottom.pieces.map((p) => ({ ...p, x: r2(p.x + shift), y: r2(p.y + rowGap) })),
  ];
  const b = bounds(pieces);
  const deco = {
    halftone: halftone(b.x2 - 40, b.y1 + 60, 260, 220, 404, { pitch: 10, max: 4.2 }),
    halftone2: halftone(b.x1 + 40, b.y2 - 30, 220, 180, 505, { pitch: 10, max: 3.8 }),
    splat: splatter(b.x1 + 150, b.y2 - 8, 26, 606, { drip: 96 }),
    splat2: splatter(b.x2 - 10, b.y1 + 14, 16, 707),
  };
  return { pieces, deco, ...frame(pieces, 70, 40) };
}

function horizontalLayout() {
  const row = layoutRow(['P', 'r', 'i', 'n', 't', 'M', 'e', '.', 'a', 'I'], 0, { seed: 13, overlap: -9 });
  // a hair more space between the two words
  const pieces = row.pieces.map((p, i) => (i >= 5 ? { ...p, x: r2(p.x + 16) } : p));
  const b = bounds(pieces);
  const deco = {
    halftone: halftone(b.x2 - 120, b.y1 + 40, 300, 170, 808, { pitch: 10, max: 4 }),
    halftone2: halftone(b.x1 + 60, b.y2 - 10, 220, 120, 909, { pitch: 10, max: 3.4 }),
    splat: splatter(b.x1 + (b.x2 - b.x1) * 0.53, b.y2 - 4, 20, 1010, { drip: 70 }),
    splat2: splatter(b.x1 - 6, b.y1 + 20, 13, 1111),
  };
  return { pieces, deco, ...frame(pieces, 60, 34) };
}

function frame(pieces, extraBottom, margin) {
  const b = bounds(pieces);
  const x = r2(b.x1 - margin);
  const y = r2(b.y1 - margin);
  const width = r2(b.x2 - b.x1 + margin * 2);
  const height = r2(b.y2 - b.y1 + margin * 2 + extraBottom);
  return { viewBox: `${x} ${y} ${width} ${height}`, width, height };
}

/* ------------------------------------------------------------------ */
/* SVG serialisation                                                   */
/* ------------------------------------------------------------------ */
const paperColor = (p, mode) => {
  if (!p) return 'none';
  if (mode === 'mono') return 'none';
  return palette[p];
};

function pieceSvg(p, mode, ids) {
  const cx = r2(p.w / 2);
  const cy = r2(p.h / 2);
  const inkFill = mode === 'mono' ? 'currentColor' : p.invert ? palette.newsprint : mode === 'inverse' && p.char === '.' ? palette.pink : palette.ink;
  const knockout = mode === 'mono' && (p.paper === 'pink' || p.paper === 'yellow' || p.invert);
  const parts = [];
  parts.push(`<g id="${ids ? p.id : ''}" data-layer="letter" transform="translate(${p.x} ${p.y}) rotate(${p.rot} ${cx} ${cy})">`);
  if (p.scrap) {
    if (knockout) {
      const maskId = `ko-${p.id}`;
      parts.push(`<mask id="${maskId}"><path d="${p.scrap}" fill="#fff"/><g transform="rotate(${p.glyphRot} ${cx} ${cy})"><path d="${p.glyph}" fill="#000"/></g></mask>`);
      parts.push(`<path data-layer="paper" d="${p.scrap}" fill="currentColor" mask="url(#${maskId})"/>`);
    } else if (mode === 'mono') {
      parts.push(`<path data-layer="paper" d="${p.scrap}" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>`);
    } else {
      const edge = mode === 'inverse' && p.invert ? ` stroke="${palette.newsprint}" stroke-width="5" stroke-linejoin="round"` : '';
      parts.push(`<path data-layer="paper" d="${p.scrap}" fill="${paperColor(p.paper, mode)}"${edge}${mode === 'textured' ? ' filter="url(#grain)"' : ''}/>`);
    }
  }
  if (p.halftone && mode !== 'mono') parts.push(`<path data-layer="halftone" d="${p.halftone}" fill="${palette.ink}" opacity=".22"/>`);
  if (!knockout) parts.push(`<g transform="rotate(${p.glyphRot} ${cx} ${cy})"><path data-layer="glyph" d="${p.glyph}" fill="${inkFill}"/></g>`);
  if (p.tape && mode !== 'mono') {
    parts.push(`<path data-layer="tape" d="${p.tape.d}" transform="translate(${p.tape.x} ${p.tape.y}) rotate(${p.tape.rot})" fill="${palette.newsprint}" fill-opacity=".78" stroke="${palette.gray}" stroke-opacity=".35"/>`);
  }
  parts.push('</g>');
  return parts.join('');
}

const grainFilter = `<filter id="grain" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -.9 .55" result="speck"/><feComposite in="speck" in2="SourceGraphic" operator="in" result="s"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="s"/></feMerge></filter>`;

function logoSvg(layout, requestedMode, title) {
  // 'web' = clean colour without halftone fields: smallest file for UI chrome
  const web = requestedMode === 'web';
  const mode = web ? 'clean' : requestedMode;
  const decoInk = mode === 'inverse' ? palette.newsprint : mode === 'mono' ? 'currentColor' : palette.ink;
  const body = [
    web ? '' : `<g data-layer="halftone-field" fill="${decoInk}" opacity="${mode === 'mono' ? '.55' : '.85'}"><path d="${layout.deco.halftone}"/><path d="${layout.deco.halftone2}"/></g>`,
    `<g data-layer="splatter" fill="${mode === 'inverse' ? palette.pink : decoInk}"><path d="${layout.deco.splat}"/><path d="${layout.deco.splat2}"/></g>`,
    `<g data-layer="letters">${layout.pieces.map((p) => pieceSvg(p, mode, true)).join('')}</g>`,
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${layout.viewBox}" width="${Math.round(layout.width)}" height="${Math.round(layout.height)}" role="img" aria-labelledby="t"${mode === 'mono' ? ' color="#111111"' : ''}>
<title id="t">${title}</title>
<defs>${mode === 'textured' ? grainFilter : ''}</defs>
${body}
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* Marks: favicon + app icon                                           */
/* ------------------------------------------------------------------ */
function glyphCentered(ch, font, size, boxW, boxH) {
  const bb = font.getPath(ch, 0, 0, size).getBoundingBox();
  const tx = (boxW - (bb.x2 - bb.x1)) / 2 - bb.x1;
  const ty = (boxH - (bb.y2 - bb.y1)) / 2 - bb.y1;
  return font.getPath(ch, tx, ty, size).toPathData(2);
}

function faviconSvg() {
  const scrap = tornRect(56, 58, 3131, { rough: 1.4, step: 7, tears: 0.6 });
  const p = glyphCentered('P', fonts.archivo, 52, 56, 58);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<title>PrintMe.ai</title>
<g transform="translate(4 3) rotate(-4 28 29)"><path d="${scrap}" fill="${palette.pink}"/><path d="${p}" fill="${palette.ink}"/></g>
</svg>
`;
}

function appIconSvg() {
  const back = tornRect(360, 360, 4141, { rough: 5, step: 18 });
  const front = tornRect(330, 340, 5151, { rough: 5, step: 18 });
  const p = glyphCentered('P', fonts.archivo, 300, 330, 340);
  const dot = blob(0, 0, 26, 6161, 0.2);
  const t = tape(140, 44, 7171);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<title>PrintMe.ai</title>
<rect width="512" height="512" fill="${palette.ink}"/>
<path d="${halftone(400, 120, 260, 220, 8181, { pitch: 14, max: 6 })}" fill="${palette.newsprint}" opacity=".35"/>
<g transform="translate(86 70) rotate(7 180 180)"><path d="${back}" fill="${palette.yellow}"/></g>
<g transform="translate(84 92) rotate(-4 165 170)"><path d="${front}" fill="${palette.paper}"/><path d="${p}" fill="${palette.ink}"/></g>
<g transform="translate(372 384)"><path d="${dot}" fill="${palette.pink}"/></g>
<path d="${t}" transform="translate(48 96) rotate(-32)" fill="${palette.pink}" fill-opacity=".9"/>
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* Brand applications                                                  */
/* ------------------------------------------------------------------ */
function nested(layout, mode, x, y, w) {
  const h = (w / layout.width) * layout.height;
  const inner = logoSvg(layout, mode, 'PrintMe.ai').replace(/<\?xml[^>]*>\s*/, '').replace(/ width="\d+" height="\d+"/, '').replace('<svg ', `<svg x="${x}" y="${y}" width="${r2(w)}" height="${r2(h)}" `);
  return { svg: inner, h };
}

function textEl(x, y, size, txt, { fill = palette.ink, family = 'Anton, Impact, sans-serif', weight = 400, anchor = 'start', spacing = 0 } = {}) {
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}">${txt}</text>`;
}

function socialPost(stacked) {
  const logo = nested(stacked, 'textured', 140, 120, 800);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
<defs>${grainFilter}</defs>
<rect width="1080" height="1350" fill="${palette.newsprint}"/>
<path d="${halftone(900, 260, 520, 480, 1212, { pitch: 16, max: 7 })}" fill="${palette.ink}" opacity=".12"/>
${logo.svg}
<g transform="translate(70 ${r2(160 + logo.h)}) rotate(-2)"><path d="${tornRect(940, 330, 1313, { rough: 4, step: 16 })}" fill="${palette.ink}"/>
${textEl(470, 150, 150, 'MAKE SHIT.', { fill: palette.yellow, anchor: 'middle' })}
${textEl(470, 290, 150, 'PRINT SHIT.', { fill: palette.pink, anchor: 'middle' })}</g>
${textEl(540, 1290, 26, 'PRINTME.AI — UPLOAD A PHOTO. MAKE IT YOURS.', { family: 'Courier New, monospace', weight: 700, anchor: 'middle', spacing: 2 })}
</svg>
`;
}

function emailHeader(horizontal) {
  const logo = nested(horizontal, 'clean', 40, 22, 380);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="600" height="160">
<rect width="600" height="160" fill="${palette.newsprint}"/>
<rect y="150" width="600" height="10" fill="${palette.ink}"/>
${logo.svg}
${textEl(560, 128, 13, 'ISSUE Nº 01 — YOUR IDEAS. YOUR RULES.', { family: 'Courier New, monospace', weight: 700, anchor: 'end', spacing: 1 })}
</svg>
`;
}

function neckLabel(stacked) {
  const logo = nested(stacked, 'mono', 20, 16, 160);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
<rect width="200" height="200" fill="${palette.paper}"/>
<g color="${palette.ink}">${logo.svg}</g>
${textEl(100, 160, 11, 'MADE TO ORDER', { family: 'Courier New, monospace', weight: 700, anchor: 'middle', spacing: 2 })}
${textEl(100, 178, 11, 'SIZE M · PRINTME.AI', { family: 'Courier New, monospace', weight: 700, anchor: 'middle', spacing: 1 })}
</svg>
`;
}

function mailerSticker(stacked) {
  const logo = nested(stacked, 'inverse', 70, 70, 460);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<circle cx="300" cy="300" r="296" fill="${palette.ink}"/>
<circle cx="300" cy="300" r="276" fill="none" stroke="${palette.yellow}" stroke-width="4" stroke-dasharray="14 10"/>
${logo.svg}
${textEl(300, 470, 38, 'HANDLE LIKE ART', { fill: palette.yellow, anchor: 'middle' })}
${textEl(300, 508, 16, 'PRINTED ON DEMAND', { fill: palette.newsprint, family: 'Courier New, monospace', weight: 700, anchor: 'middle', spacing: 1 })}
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */
function write(rel, content) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log('wrote', rel, `${(Buffer.byteLength(content) / 1024).toFixed(1)} KB`);
}

const stacked = stackedLayout();
const horizontal = horizontalLayout();
const name = 'PrintMe.ai';

const lockups = {
  'printme-logo-horizontal.svg': logoSvg(horizontal, 'textured', name),
  'printme-logo-horizontal-clean.svg': logoSvg(horizontal, 'clean', name),
  'printme-logo-horizontal-web.svg': logoSvg(horizontal, 'web', name),
  'printme-logo-stacked.svg': logoSvg(stacked, 'textured', name),
  'printme-logo-stacked-clean.svg': logoSvg(stacked, 'clean', name),
  'printme-logo-horizontal-mono.svg': logoSvg(horizontal, 'mono', name),
  'printme-logo-stacked-mono.svg': logoSvg(stacked, 'mono', name),
  'printme-logo-horizontal-inverse.svg': logoSvg(horizontal, 'inverse', name),
  'printme-logo-stacked-inverse.svg': logoSvg(stacked, 'inverse', name),
  'printme-favicon.svg': faviconSvg(),
  'printme-app-icon.svg': appIconSvg(),
};
for (const [file, svg] of Object.entries(lockups)) {
  write(`brand/logo/${file}`, svg);
  write(`public/brand/${file}`, svg);
}
write('app/icon.svg', lockups['printme-favicon.svg']);

write('brand/applications/social-post-1080x1350.svg', socialPost(stacked));
write('brand/applications/email-header-600x160.svg', emailHeader(horizontal));
write('brand/applications/neck-label-mono.svg', neckLabel(stacked));
write('brand/applications/mailer-sticker.svg', mailerSticker(stacked));

const strip = (l) => ({
  viewBox: l.viewBox,
  width: l.width,
  height: l.height,
  deco: { splat: l.deco.splat, splat2: l.deco.splat2 },
  // halftone patches are print-only texture; the web layer data omits them
  pieces: l.pieces.map((p) => ({ ...p, halftone: undefined })),
});
write(
  'lib/brand/logo-layers.json',
  JSON.stringify({ generatedBy: 'scripts/brand/build-logo.mjs', palette, horizontal: strip(horizontal), stacked: strip(stacked) }),
);
