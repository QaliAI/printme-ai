import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { CutoutError, removeBackground } from '@/lib/segmentation/cloudinary-cutout';
import { isCommerceE2ERequest } from '@/lib/commerce/testing/e2e-harness';

export const maxDuration = 60;

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;
const LIMIT = 10;
const WINDOW_MS = 10 * 60_000;

const state = globalThis as typeof globalThis & { __cutoutGate?: { key: Buffer; hits: Map<string, { count: number; expires: number }> } };

function rateLimit(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) throw new CutoutError('Refresh PrintMe and try again.', 403, 'INVALID_ORIGIN');
  state.__cutoutGate ??= { key: randomBytes(32), hits: new Map() };
  const gate = state.__cutoutGate;
  const now = Date.now();
  for (const [key, entry] of gate.hits) if (entry.expires <= now) gate.hits.delete(key);
  const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = createHmac('sha256', gate.key).update(client).digest('hex');
  const entry = gate.hits.get(key) ?? { count: 0, expires: now + WINDOW_MS };
  if (entry.count >= LIMIT || gate.hits.size >= 10_000) {
    throw new CutoutError('You have removed a lot of backgrounds. Please wait a few minutes.', 429, 'CUTOUT_RATE_LIMIT');
  }
  entry.count++;
  gate.hits.set(key, entry);
}

/** Deterministic stand-in for automated tests: an elliptical cutout, no external calls. */
async function testCutout(bytes: Buffer) {
  const image = sharp(bytes).rotate();
  const { width = 800, height = 800 } = await image.metadata();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${width * 0.36}" ry="${height * 0.42}" fill="#fff"/></svg>`,
  );
  return image.ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const testMode = isCommerceE2ERequest(request);
    if (!testMode) rateLimit(request);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof Blob) || !file.size || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Choose a photo smaller than 10 MB.', code: 'INVALID_IMAGE' }, { status: 400 });
    }
    if (!ACCEPTED.has(file.type)) {
      return NextResponse.json({ error: 'Choose a JPEG, PNG or WebP photo.', code: 'INVALID_TYPE' }, { status: 415 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = testMode ? await testCutout(bytes) : await removeBackground(bytes, file.type);
    return new NextResponse(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Cutout-Source': testMode ? 'e2e-stub' : 'cloudinary' },
    });
  } catch (error) {
    if (error instanceof CutoutError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: 'Background removal did not finish. Please try again.', code: 'CUTOUT_FAILED' }, { status: 503 });
  }
}
