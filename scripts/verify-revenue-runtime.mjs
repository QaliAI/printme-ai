import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { createClient } from '@supabase/supabase-js';

const env = process.env;
const text = readFileSync(resolve('.env.local'), 'utf8');
for (const line of text.split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}
const report = { project: 'vfgbvnfhvjmkmfmianpb', dns: false, liveHealth: null, artworkPersistence: null, cleanup: null };
if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname !== `${report.project}.supabase.co`) throw new Error('Canonical Supabase URL required.');
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
let storagePath;
try {
  await lookup(`${report.project}.supabase.co`);
  report.dns = true;
  const health = await fetch('https://www.printme.ai/api/health', { signal: AbortSignal.timeout(15_000) });
  report.liveHealth = health.status;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'verification.png');
  form.append('designId', `verification-${randomUUID()}`);
  form.append('revision', '1');
  const response = await fetch('https://www.printme.ai/api/commerce/artwork/persist', { method: 'POST', body: form, signal: AbortSignal.timeout(30_000) });
  const data = await response.json();
  storagePath = data.storagePath;
  report.artworkPersistence = { status: response.status, code: data.code ?? null, retrievable: false, contentType: null };
  if (response.ok && data.productionAssetUrl) {
    const asset = await fetch(data.productionAssetUrl, { signal: AbortSignal.timeout(15_000) });
    report.artworkPersistence.retrievable = asset.ok && Buffer.from(await asset.arrayBuffer()).equals(png);
    report.artworkPersistence.contentType = asset.headers.get('content-type');
  }
} catch (error) { report.error = error.cause?.code || error.code || error.name; }
finally {
  if (storagePath && /^production\/verification-[0-9a-f-]+\//.test(storagePath)) {
    const removed = await client.storage.from('user-uploads').remove([storagePath]);
    report.cleanup = !removed.error;
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.artworkPersistence?.retrievable) process.exitCode = 1;
}
