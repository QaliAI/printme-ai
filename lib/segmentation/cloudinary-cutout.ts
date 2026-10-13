import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Subject segmentation via Cloudinary's AI background removal
 * (`e_background_removal`), using the account PrintMe already runs.
 *
 * Chosen after side-by-side testing against BiRefNet-lite on cats, long fur,
 * a white dog on snow, curly hair, products and people: equal edge quality,
 * better at excluding furniture, and it runs server-side so it works on any
 * phone. Privacy: the photo is uploaded as an *authenticated* (non-public)
 * asset with a random id, the cutout is fetched through a signed URL, and
 * both are destroyed immediately afterwards.
 */

export class CutoutError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

function config() {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new CutoutError('Background removal is not available right now.', 503, 'CUTOUT_UNAVAILABLE');
  return { cloud, key, secret };
}

function sign(params: Record<string, string | number>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');
  return createHash('sha1').update(payload + secret).digest('hex');
}

async function destroy(publicId: string) {
  const { cloud, key, secret } = config();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: 'true', public_id: publicId, timestamp, type: 'authenticated' };
  const body = new FormData();
  for (const [name, value] of Object.entries(params)) body.append(name, String(value));
  body.append('api_key', key);
  body.append('signature', sign(params, secret));
  await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: 'POST', body }).catch(() => undefined);
}

export async function removeBackground(bytes: Buffer, mimeType: string): Promise<Buffer> {
  const { cloud, key, secret } = config();
  const publicId = `printme/cutouts/${randomBytes(16).toString('hex')}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, type: 'authenticated' };
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mimeType }));
  for (const [name, value] of Object.entries(params)) form.append(name, String(value));
  form.append('api_key', key);
  form.append('signature', sign(params, secret));

  const upload = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(30_000) });
  if (!upload.ok) throw new CutoutError('We could not read that photo. Try another one.', 422, 'CUTOUT_UPLOAD_FAILED');

  try {
    const transformation = 'e_background_removal/f_png';
    const toSign = `${transformation}/${publicId}`;
    const signature = createHash('sha1')
      .update(toSign + secret)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .slice(0, 8);
    const url = `https://res.cloudinary.com/${cloud}/image/authenticated/s--${signature}--/${toSign}`;
    // The first request can return 423 while the cutout is being produced.
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok && response.headers.get('content-type')?.includes('png')) {
        return Buffer.from(await response.arrayBuffer());
      }
      if (response.status !== 423 && response.status !== 420) {
        throw new CutoutError('Background removal is busy. Please try again shortly.', 503, `CUTOUT_${response.status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    throw new CutoutError('Background removal took too long. Please try again.', 504, 'CUTOUT_TIMEOUT');
  } finally {
    await destroy(publicId);
  }
}
