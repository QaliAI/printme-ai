import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envText = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const testPath = `production/test-artwork-${Date.now()}.png`;
  // 1x1 transparent PNG buffer
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const { data: upData, error: upError } = await supabase.storage
    .from('user-uploads')
    .upload(testPath, pngBuffer, { contentType: 'image/png', upsert: true });

  if (upError) {
    console.error('Upload failed:', upError);
    return;
  }
  console.log('Upload SUCCESS to user-uploads:', upData.path);

  // Create 1-year signed URL
  const { data: signData, error: signError } = await supabase.storage
    .from('user-uploads')
    .createSignedUrl(testPath, 60 * 60 * 24 * 365);

  console.log('Generated 1-year signed URL:', signData?.signedUrl);

  // Verify fetch works on signed URL
  const fetchRes = await fetch(signData.signedUrl);
  console.log('Fetch signed URL status:', fetchRes.status);
  console.log('Fetch content type:', fetchRes.headers.get('content-type'));

  // Test recovering fresh URL from storagePath
  const storagePath = testPath;
  const { data: recoveredSign, error: recoverError } = await supabase.storage
    .from('user-uploads')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 30);
  console.log('Recovered fresh 30-day signed URL:', recoveredSign?.signedUrl);

  // Clean up
  await supabase.storage.from('user-uploads').remove([testPath]);
  console.log('Test file cleaned up successfully!');
}

main().catch(console.error);
