import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { CartIdentity } from './cart-service';

export const COMMERCE_CART_COOKIE = 'printme_cart_session';
const CART_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export interface CartRequestIdentity extends CartIdentity {
  rawGuestToken: string;
  isNewGuestToken: boolean;
}

export function hashGuestCartToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function createGuestCartToken() {
  return randomBytes(32).toString('base64url');
}

async function resolveUserId(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return undefined;

  const token = authorization.slice('Bearer '.length);
  const {
    data: { user },
    error,
  } = await getSupabaseAdminClient().auth.getUser(token);
  if (error || !user) return undefined;
  return user.id;
}

export async function resolveCartRequestIdentity(
  request: NextRequest
): Promise<CartRequestIdentity> {
  const existingToken = request.cookies.get(COMMERCE_CART_COOKIE)?.value;
  const rawGuestToken = existingToken ?? createGuestCartToken();
  return {
    guestTokenHash: hashGuestCartToken(rawGuestToken),
    userId: await resolveUserId(request),
    rawGuestToken,
    isNewGuestToken: !existingToken,
  };
}

export function attachCartSessionCookie(
  response: NextResponse,
  identity: CartRequestIdentity
) {
  if (!identity.isNewGuestToken) return response;
  response.cookies.set(COMMERCE_CART_COOKIE, identity.rawGuestToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: CART_COOKIE_MAX_AGE,
    path: '/',
    priority: 'high',
  });
  return response;
}
