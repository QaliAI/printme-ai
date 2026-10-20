'use client';

/**
 * Personalized "Specimen Plate": the customer's own cutout set in the PrintMe
 * Specimen Plates layout (scripts/designs/build-specimen-plates.mjs), drawn in
 * the browser at the tee print-area size so the file that prints is the file
 * the visitor previewed.
 */

export const PLATE_WIDTH = 3951;
export const PLATE_HEIGHT = 4800;

export const plateSpecies = {
  cat: 'FELIS CATUS',
  dog: 'CANIS FAMILIARIS',
  rabbit: 'ORYCTOLAGUS CUNICULUS',
  other: 'ANIMALIA',
} as const;

export const plateTitles = ['certified menace', 'professional napper', 'snack inspector', 'very good boy', 'very good girl'] as const;

export type PlateSpecies = keyof typeof plateSpecies;
export type PlateTitle = (typeof plateTitles)[number];

export interface PlateInput {
  /** Trimmed transparent cutout. */
  subject: CanvasImageSource & { width: number; height: number };
  name: string;
  species: PlateSpecies;
  title: PlateTitle;
  serifFamily: string;
  monoFamily: string;
}

const INK = '#1d1a17';
const ACCENT = '#c9737f';
export const PLATE_KICKER = 'PORTRAIT OF A VERY IMPORTANT ANIMAL.';

/** Uppercase, trimmed, at most 16 visible characters. Empty names fall back. */
export function plateName(raw: string) {
  const clean = raw.replace(/\s+/g, ' ').trim().slice(0, 16).toUpperCase();
  return clean || 'YOUR PET';
}

/**
 * Loads only the web fonts. next/font family lists also name a fallback face
 * (src: local("Times New Roman") / local("Arial")); where that OS font is
 * missing (Linux, Android) Chromium rejects document.fonts.load for the whole list.
 */
export async function loadPlateFonts(serifFamily: string, monoFamily: string) {
  const serif = serifFamily.split(',')[0].trim();
  const mono = monoFamily.split(',')[0].trim();
  await Promise.all([
    document.fonts.load(`400 200px ${serif}`),
    document.fonts.load(`italic 400 200px ${serif}`),
    document.fonts.load(`700 100px ${mono}`),
  ]);
}

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function setFont(ctx: Ctx, font: string, trackingPx = 0) {
  ctx.font = font;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${trackingPx}px`;
}

/** Font size (px) at which `text` is exactly `width` wide, capped at `max`. */
function fit(ctx: Ctx, text: string, fontAt: (size: number) => string, width: number, max: number, tracking = 0) {
  setFont(ctx, fontAt(100), tracking * 100);
  const at100 = ctx.measureText(text).width;
  return Math.min(max, (100 * width) / at100);
}

export function drawSpecimenPlate(canvas: HTMLCanvasElement, input: PlateInput) {
  const W = PLATE_WIDTH;
  const H = PLATE_HEIGHT;
  const f = W / 4500;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const margin = 150 * f;
  const inner = W - margin * 2;
  const serif = (size: number, italic = false) => `${italic ? 'italic ' : ''}400 ${size}px ${input.serifFamily}`;
  const mono = (size: number) => `700 ${size}px ${input.monoFamily}`;

  // Figure label + rule.
  const labelSize = 92 * f;
  const label = `FIG. 01  ·  ${plateSpecies[input.species]}`;
  setFont(ctx, mono(labelSize), labelSize * 0.18);
  const labelBaseline = margin + labelSize * 0.72;
  ctx.fillStyle = INK;
  ctx.fillText(label, W / 2, labelBaseline);
  const labelWidth = ctx.measureText(label).width;
  ctx.fillRect((W - labelWidth) / 2, labelBaseline + 48 * f, labelWidth, 10 * f);

  // Name headline.
  const name = plateName(input.name);
  const topSize = fit(ctx, name, (s) => serif(s), inner, 1100 * f, 0.02);
  setFont(ctx, serif(topSize), topSize * 0.02);
  const topBaseline = labelBaseline + 120 * f + topSize * 0.7;
  ctx.fillText(name, W / 2, topBaseline);

  // Kicker and italic title at the bottom.
  const kickerSize = Math.min(116 * f, fit(ctx, PLATE_KICKER, mono, inner, 116 * f, 0.06));
  const kickerBaseline = H - margin;
  const bottomSize = fit(ctx, input.title, (s) => serif(s, true), inner * 0.92, 1500 * f, 0.01);
  const bottomBaseline = kickerBaseline - kickerSize - 150 * f;
  const bottomTop = bottomBaseline - bottomSize * 0.5;

  // Title first, subject above it.
  ctx.save();
  setFont(ctx, serif(bottomSize, true), bottomSize * 0.01);
  ctx.fillStyle = ACCENT;
  ctx.fillText(input.title, W / 2, bottomBaseline);
  ctx.restore();

  // Photos are often cropped flat at the bottom, so the subject stops just
  // above the title (letters stay readable) and the crop line is faded out.
  const artTop = topBaseline + 100 * f;
  const artBottom = bottomTop - bottomSize * 0.06;
  const boxH = artBottom - artTop;
  const scale = Math.min(boxH / input.subject.height, (inner * 0.92) / input.subject.width);
  const artW = Math.round(input.subject.width * scale);
  const artH = Math.round(input.subject.height * scale);
  const layer = document.createElement('canvas');
  layer.width = artW;
  layer.height = artH;
  const lctx = layer.getContext('2d')!;
  lctx.imageSmoothingQuality = 'high';
  lctx.drawImage(input.subject, 0, 0, artW, artH);
  const fade = lctx.createLinearGradient(0, artH * 0.9, 0, artH);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  lctx.globalCompositeOperation = 'destination-out';
  lctx.fillStyle = fade;
  lctx.fillRect(0, artH * 0.9, artW, artH * 0.1);
  ctx.drawImage(layer, Math.round((W - artW) / 2), Math.round(artBottom - artH));

  setFont(ctx, mono(kickerSize), kickerSize * 0.06);
  ctx.fillStyle = INK;
  ctx.fillText(PLATE_KICKER, W / 2, kickerBaseline);
  return canvas;
}

export async function renderSpecimenPlate(input: PlateInput) {
  await loadPlateFonts(input.serifFamily, input.monoFamily);
  const canvas = drawSpecimenPlate(document.createElement('canvas'), input);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('The plate could not be prepared.'))), 'image/png'),
  );
  return { blob, width: PLATE_WIDTH, height: PLATE_HEIGHT };
}
