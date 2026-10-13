import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateDurableArtwork } from './generate-artwork';
import { ImageProviderError } from './image-provider';
import { guardImageRequest } from './request-gate';

const schema = z.object({ uploadId: z.string().max(120).optional(), styleId: z.string().uuid(), imageUrl: z.string().url().max(8000) });

export async function handleLegacyGeneration(request: NextRequest, variation = false) {
  let pendingId: string | undefined;
  try {
    guardImageRequest(request);
    const body = schema.parse(await request.json());
    const supabase = getSupabaseAdminClient();
    const style = await supabase.from('style_presets').select('name, description').eq('id', body.styleId).single();
    if (style.error || !style.data) return NextResponse.json({ error: 'Style not found.' }, { status: 404 });
    const user = await getCurrentUser();
    let sourceUrl = body.imageUrl;
    if (user) {
      if (!body.uploadId) return NextResponse.json({ error: 'Upload ID is required.' }, { status: 400 });
      const upload = await supabase.from('user_uploads').select('id, original_url').eq('id', body.uploadId).eq('user_id', user.id).single();
      if (upload.error || !upload.data) return NextResponse.json({ error: 'Upload not found.' }, { status: 404 });
      sourceUrl = upload.data.original_url;
      const pending = await supabase.from('generated_designs').insert({ upload_id: body.uploadId, style_preset_id: body.styleId, original_image_url: sourceUrl, user_id: user.id, status: 'generating', ai_provider: 'openai' }).select('id').single();
      if (pending.error || !pending.data) throw new Error('Unable to create design record.');
      pendingId = pending.data.id;
    }
    const id = pendingId ?? `guest-design-${randomUUID()}`;
    const result = await generateDurableArtwork({ imageUrl: sourceUrl, workflow: 'photo-edit', promptTemplate: `${style.data.name}: ${style.data.description}${variation ? '. Create a fresh composition while preserving the same subject.' : ''}` }, { designId: id, revision: 1 });
    if (pendingId) {
      const saved = await supabase.from('generated_designs').update({ generated_image_url: result.productionAssetUrl, ai_request_id: result.requestId, status: 'completed' }).eq('id', pendingId).select().single();
      if (saved.error) throw new Error('Unable to save design.');
      return NextResponse.json({ ...saved.data, design_url: saved.data.generated_image_url });
    }
    return NextResponse.json({ id, status: 'completed', design_url: result.productionAssetUrl, style_preset_id: body.styleId, storage_path: result.storagePath });
  } catch (error) {
    if (pendingId) await getSupabaseAdminClient().from('generated_designs').update({ status: 'failed' }).eq('id', pendingId);
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid design request.' }, { status: 400 });
    if (error instanceof ImageProviderError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: 'Your design could not be generated and saved. Please try again.' }, { status: 503 });
  }
}
