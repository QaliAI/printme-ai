import 'server-only';
import { createHash } from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export class ArtworkStorageError extends Error {
  constructor() { super('Your artwork could not be saved. Please try again before adding it to your bag.'); }
}

export async function persistArtwork(input: { bytes: Buffer; mimeType: string; designId: string; revision: number }) {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(input.designId) || !Number.isSafeInteger(input.revision) || input.revision < 1 ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(input.mimeType) || !input.bytes.length || input.bytes.length > 10 * 1024 * 1024) {
    throw new ArtworkStorageError();
  }
  const checksum = createHash('sha256').update(input.bytes).digest('hex');
  const ext = input.mimeType === 'image/jpeg' ? 'jpg' : input.mimeType === 'image/webp' ? 'webp' : 'png';
  const storagePath = `production/${input.designId}/r${input.revision}-${checksum.slice(0, 12)}.${ext}`;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from('user-uploads').upload(storagePath, input.bytes, { contentType: input.mimeType, upsert: true });
  if (error) throw new ArtworkStorageError();
  const signed = await supabase.storage.from('user-uploads').createSignedUrl(storagePath, 60 * 60 * 24 * 365);
  if (signed.error || !signed.data?.signedUrl) throw new ArtworkStorageError();
  return { productionAssetUrl: signed.data.signedUrl, storagePath, checksum };
}
