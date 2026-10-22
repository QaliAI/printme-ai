import 'server-only';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { PetGenerationError } from './schemas';

export const PETS_SESSION_COOKIE = 'printme_pets_session';
export async function petIdentity(request: NextRequest) {
  const existing = request.cookies.get(PETS_SESSION_COOKIE)?.value;
  const token = existing && /^[A-Za-z0-9_-]{43}$/.test(existing) ? existing : randomBytes(32).toString('base64url');
  let owner = `guest:${token}`;
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const { data, error } = await getSupabaseAdminClient().auth.getUser(authorization.slice(7));
    if (error || !data.user) throw new PetGenerationError('PETS_UNAUTHORIZED', 'Sign in again to access this portrait.', 401);
    owner = `user:${data.user.id}`;
  }
  const secret = process.env.PETS_QUOTA_SECRET;
  const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return { token, isNew: token !== existing, ownerHash: createHash('sha256').update(owner).digest('hex'), ipHash: secret ? createHmac('sha256', secret).update(client).digest('hex') : '' };
}
export function petResponse(request: NextRequest, identity: Awaited<ReturnType<typeof petIdentity>>, value: unknown, status = 200) {
  const response = NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
  return attachPetCookie(request, identity, response);
}
export function attachPetCookie(request: NextRequest, identity: Awaited<ReturnType<typeof petIdentity>>, response: NextResponse) {
  if (identity.isNew) response.cookies.set(PETS_SESSION_COOKIE, identity.token, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 30 * 24 * 60 * 60 });
  return response;
}
export function requirePetOrigin(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) throw new PetGenerationError('PETS_INVALID_ORIGIN', 'Refresh PrintMe and try again.', 403);
}
export function petErrorResponse(error: unknown) {
  if (error instanceof PetGenerationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
  return NextResponse.json({ error: 'Portrait generation is temporarily unavailable. Your saved draft is still on this device.', code: 'PETS_GENERATION_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
}
