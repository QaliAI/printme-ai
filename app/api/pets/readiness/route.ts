import { NextResponse, type NextRequest } from 'next/server';
import { petGenerationConfig, petGenerationConfigured } from '@/lib/pets/generation';
import { SupabasePetGenerationStore } from '@/lib/pets/store';
import { petIdentity, petResponse } from '@/lib/pets/server';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  let enabled = false;
  try {
    const configured = petGenerationConfigured(petGenerationConfig());
    enabled = configured && await new SupabasePetGenerationStore().verify();
    return petResponse(request, await petIdentity(request), { enabled, reason: enabled ? 'Your preview allowance is checked before each render.' : 'Portrait generation is being prepared. Save your photos and style for later.' });
  } catch {
    return NextResponse.json({ enabled: false, reason: 'Portrait generation is being prepared. Your draft can still be saved.' }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
}
