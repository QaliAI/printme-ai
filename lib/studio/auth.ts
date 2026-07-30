import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isStudioE2ERequest } from './testing/e2e-harness';

export interface StudioActor {
  userId: string;
  email: string | null;
}

function matchesOperationsSecret(request: NextRequest) {
  const expected = process.env.STUDIO_OPERATIONS_SECRET;
  const supplied = request.headers.get('x-studio-operations-secret');
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

export async function getStudioActor(
  request: NextRequest,
): Promise<StudioActor | null> {
  if (isStudioE2ERequest(request)) {
    return {
      userId: 'studio-e2e-admin',
      email: 'studio-admin@example.test',
    };
  }
  if (matchesOperationsSecret(request)) {
    return { userId: 'studio-operations', email: null };
  }
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length);
  const {
    data: { user },
    error,
  } = await getSupabaseAdminClient().auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await getSupabaseAdminClient()
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return null;
  return { userId: user.id, email: user.email ?? null };
}
