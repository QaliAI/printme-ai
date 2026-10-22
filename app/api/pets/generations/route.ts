import { NextResponse, type NextRequest } from 'next/server';
import { generatePetPortrait, petGenerationConfig } from '@/lib/pets/generation';
import { PETS_MAX_BODY_BYTES, petGenerationRequestSchema, PetGenerationError } from '@/lib/pets/schemas';
import { SupabasePetGenerationStore } from '@/lib/pets/store';
import { petIdentity, petResponse, petErrorResponse, requirePetOrigin, attachPetCookie } from '@/lib/pets/server';

export const runtime = 'nodejs';
export const maxDuration = 120;
export async function POST(request: NextRequest) {
  let identity: Awaited<ReturnType<typeof petIdentity>> | undefined;
  try {
    requirePetOrigin(request);
    if (!request.headers.get('content-type')?.includes('application/json')) throw new PetGenerationError('PETS_INVALID_REQUEST', 'Send a valid portrait request.', 415);
    const length = Number(request.headers.get('content-length'));
    if (length > PETS_MAX_BODY_BYTES) throw new PetGenerationError('PETS_REQUEST_TOO_LARGE', 'Prepare smaller photos before trying again.', 413);
    // Bound streamed/chunked bodies as well as requests carrying Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new PetGenerationError('PETS_INVALID_REQUEST', 'Choose photos and a style first.', 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > PETS_MAX_BODY_BYTES) { await reader.cancel(); throw new PetGenerationError('PETS_REQUEST_TOO_LARGE', 'Prepare smaller photos before trying again.', 413); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new PetGenerationError('PETS_INVALID_REQUEST', 'Send a valid portrait request.', 400); }
    const parsed = petGenerationRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Choose up to four prepared pet/person photos, an available style and a valid request ID.', code: 'PETS_INVALID_REQUEST' }, { status: 400 });
    identity = await petIdentity(request);
    const result = await generatePetPortrait(parsed.data, identity, petGenerationConfig(), { store: new SupabasePetGenerationStore() });
    return petResponse(request, identity, result, result.status === 'completed' ? 200 : 202);
  } catch (error) {
    const response = petErrorResponse(error);
    return identity ? attachPetCookie(request, identity, response) : response;
  }
}
