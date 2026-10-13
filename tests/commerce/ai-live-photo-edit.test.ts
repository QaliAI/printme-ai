import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { generateDurableArtwork } from '@/lib/ai/generate-artwork';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const live = process.env.OPENAI_LIVE_PHOTO_EDIT === 'true' ? describe : describe.skip;
live('explicit live photo-edit smoke (billable; excluded from ordinary tests)', () => {
  it('edits a repository fixture, persists a retrievable PNG, and cleans up only its verification asset', async () => {
    const source = readFileSync('public/landing/transformations/pet-original.webp');
    const id = `verification-${randomUUID()}`;
    let path: string | undefined;
    try {
      const result = await generateDurableArtwork({ imageUrl: `data:image/webp;base64,${source.toString('base64')}`, workflow: 'photo-edit', promptTemplate: 'Turn this same pet into friendly Halloween portrait art with pumpkins and tiny stars. Preserve the pet and all distinctive markings.' }, { designId: id, revision: 1 });
      path = result.storagePath;
      const response = await fetch(result.productionAssetUrl);
      expect(response.ok).toBe(true);
      const output = Buffer.from(await response.arrayBuffer());
      expect(output.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(output.equals(source)).toBe(false);
      mkdirSync('audit/revenue-activation', { recursive: true });
      writeFileSync('audit/revenue-activation/live-ai-pet.png', output);
      console.info('Live photo edit verified', { model: result.model, width: result.width, height: result.height, stored: true, retrieved: true });
    } finally {
      if (path?.startsWith(`production/${id}/`)) {
        const cleanup = await getSupabaseAdminClient().storage.from('user-uploads').remove([path]);
        expect(cleanup.error).toBeNull();
      }
    }
  }, 150_000);
});
