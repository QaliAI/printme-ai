#!/usr/bin/env node
// AI super-resolution for design sources via Cloudinary `e_upscale` (4x),
// using the account PrintMe already runs. The source is uploaded as an
// authenticated asset and destroyed right after the result is fetched.
//
//   node --env-file=.env.local scripts/designs/upscale.mjs <in.png> <out.png>
import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const [input, output] = process.argv.slice(2);
const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const key = process.env.CLOUDINARY_API_KEY;
const secret = process.env.CLOUDINARY_API_SECRET;
if (!input || !output || !cloud || !key || !secret) {
  console.error('usage: upscale.mjs <in> <out> (needs Cloudinary env)');
  process.exit(1);
}

const sign = (params) =>
  createHash('sha1')
    .update(
      Object.keys(params)
        .sort()
        .map((name) => `${name}=${params[name]}`)
        .join('&') + secret,
    )
    .digest('hex');

async function call(endpoint, params, file) {
  const form = new FormData();
  if (file) form.append('file', file);
  for (const [name, value] of Object.entries(params)) form.append(name, String(value));
  form.append('api_key', key);
  form.append('signature', sign(params));
  return fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/${endpoint}`, { method: 'POST', body: form });
}

const publicId = `printme/upscale/${randomBytes(12).toString('hex')}`;
const timestamp = Math.floor(Date.now() / 1000);
const upload = await call('upload', { public_id: publicId, timestamp, type: 'authenticated' }, new Blob([await readFile(input)], { type: 'image/png' }));
if (!upload.ok) throw new Error(`upload ${upload.status} ${await upload.text()}`);
try {
  // Opaque sources: a q_95 JPEG stays under the plan's 10 MB delivery cap.
  const transformation = 'e_upscale/q_95/f_jpg';
  const toSign = `${transformation}/${publicId}`;
  const signature = createHash('sha1').update(toSign + secret).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8);
  const url = `https://res.cloudinary.com/${cloud}/image/authenticated/s--${signature}--/${toSign}`;
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(url);
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
      await writeFile(output, Buffer.from(await response.arrayBuffer()));
      console.log(`upscaled ${input} -> ${output}`);
      break;
    }
    if (response.status !== 423 && response.status !== 420) throw new Error(`upscale ${response.status} ${response.headers.get('x-cld-error') ?? ''}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
} finally {
  await call('destroy', { invalidate: 'true', public_id: publicId, timestamp: Math.floor(Date.now() / 1000), type: 'authenticated' });
}
