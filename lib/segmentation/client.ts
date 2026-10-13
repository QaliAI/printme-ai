'use client';

/**
 * Photo cutouts for the homepage try-it flow and the studio.
 *
 * The server (POST /api/commerce/artwork/remove-background) returns a
 * transparent PNG from Cloudinary's AI background removal. We keep the
 * visitor's original pixels locally and use the returned alpha as an editable
 * mask, so the refine brush can erase leftovers or restore missed detail.
 */

/** Long-edge cap for cutouts: keeps memory sane on phones while staying print-capable. */
export const CUTOUT_MAX_SIDE = 3200;

export interface SegmentationProgress {
  stage: 'upload' | 'process';
}

export interface Cutout {
  /** Original pixels (orientation-corrected), never modified. */
  source: HTMLCanvasElement;
  /** Alpha mask at the same resolution (alpha = coverage), editable by the refiner. */
  mask: HTMLCanvasElement;
  ms: number;
}

export class SegmentationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function decode(blob: Blob, maxSide: number) {
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare images.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('Image could not be prepared.'))), type, quality),
  );
}

/** Removes the background from a photo and returns source + editable mask. */
export async function segmentPhoto(blob: Blob, onProgress?: (progress: SegmentationProgress) => void): Promise<Cutout> {
  const started = performance.now();
  const source = await decode(blob, CUTOUT_MAX_SIDE);
  // Upload the orientation-corrected pixels so the returned mask lines up exactly.
  const upload = blob.type === 'image/png' ? await toBlob(source, 'image/png') : await toBlob(source, 'image/jpeg', 0.93);
  onProgress?.({ stage: 'upload' });
  const body = new FormData();
  body.append('file', upload, upload.type === 'image/png' ? 'photo.png' : 'photo.jpg');
  const response = await fetch('/api/commerce/artwork/remove-background', { method: 'POST', body, signal: AbortSignal.timeout(70_000) });
  onProgress?.({ stage: 'process' });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new SegmentationError(payload?.error ?? 'Background removal did not finish. Please try again.', response.status);
  }
  const cutout = await createImageBitmap(await response.blob());
  const mask = document.createElement('canvas');
  mask.width = source.width;
  mask.height = source.height;
  const context = mask.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  context.drawImage(cutout, 0, 0, mask.width, mask.height);
  cutout.close();
  return { source, mask, ms: Math.round(performance.now() - started) };
}

/** Composes source + mask into a trimmed transparent PNG. */
export async function renderCutout(cutout: Pick<Cutout, 'source' | 'mask'>): Promise<{ blob: Blob; width: number; height: number }> {
  const trimmed = trimTransparent(composeCutout(cutout));
  return { blob: await toBlob(trimmed, 'image/png'), width: trimmed.width, height: trimmed.height };
}

/** Source pixels with the mask applied as alpha (canvas, untrimmed). */
export function composeCutout({ source, mask }: Pick<Cutout, 'source' | 'mask'>, target?: HTMLCanvasElement) {
  const out = target ?? document.createElement('canvas');
  if (!target) {
    out.width = source.width;
    out.height = source.height;
  }
  const context = out.getContext('2d')!;
  context.save();
  context.clearRect(0, 0, out.width, out.height);
  context.drawImage(source, 0, 0, out.width, out.height);
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(mask, 0, 0, out.width, out.height);
  context.restore();
  return out;
}

/** Crops fully transparent margins so the subject fills the print area. */
function trimTransparent(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return canvas;
  const pad = Math.round(Math.max(width, height) * 0.01);
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width - 1, x1 + pad);
  y1 = Math.min(height - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
