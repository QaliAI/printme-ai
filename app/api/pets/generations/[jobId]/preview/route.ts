import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { PetGenerationError } from '@/lib/pets/schemas';
import { petErrorResponse, petIdentity } from '@/lib/pets/server';
import { SupabasePetGenerationStore } from '@/lib/pets/store';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    if (!z.string().uuid().safeParse(jobId).success) throw new PetGenerationError('PETS_NOT_FOUND', 'Portrait not found.', 404);
    const identity = await petIdentity(request);
    const job = await new SupabasePetGenerationStore().find(jobId, identity.ownerHash);
    if (!job || job.status !== 'completed' || job.preview_path !== `pets/${jobId}/preview.png`) throw new PetGenerationError('PETS_NOT_FOUND', 'Portrait preview not found.', 404);
    const signed = await getSupabaseAdminClient().storage.from('user-uploads').createSignedUrl(job.preview_path, 600);
    if (signed.error || !signed.data?.signedUrl) throw new PetGenerationError('PETS_PREVIEW_UNAVAILABLE', 'Your preview is temporarily unavailable.');
    return NextResponse.redirect(signed.data.signedUrl, { status: 307, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { return petErrorResponse(error); }
}
