import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { publicPetJob } from '@/lib/pets/generation';
import { PetGenerationError } from '@/lib/pets/schemas';
import { petErrorResponse, petIdentity, petResponse } from '@/lib/pets/server';
import { SupabasePetGenerationStore } from '@/lib/pets/store';

export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;
    if (!z.string().uuid().safeParse(jobId).success) throw new PetGenerationError('PETS_NOT_FOUND', 'Portrait not found.', 404);
    const identity = await petIdentity(request);
    const job = await new SupabasePetGenerationStore().find(jobId, identity.ownerHash);
    if (!job) throw new PetGenerationError('PETS_NOT_FOUND', 'Portrait not found.', 404);
    return petResponse(request, identity, publicPetJob(job));
  } catch (error) { return petErrorResponse(error); }
}
