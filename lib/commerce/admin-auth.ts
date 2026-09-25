import 'server-only';

import { type NextRequest } from 'next/server';
import { hasCommerceOperationsAccess } from './operations-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Checks whether an incoming request has authorization to access admin commerce endpoints.
 * Accepts either:
 * 1. Valid `x-commerce-operations-secret` header matching COMMERCE_OPERATIONS_SECRET.
 * 2. Authenticated user session with `is_admin === true` in profiles.
 * 3. In non-production development environments, allows operations if explicitly permitted.
 */
export async function verifyAdminOrOperationsAccess(
  request: NextRequest,
): Promise<{ authorized: boolean; operatorEmail?: string; reason?: string }> {
  // 1. Direct operations secret header check
  if (hasCommerceOperationsAccess(request)) {
    return { authorized: true, operatorEmail: 'system-operations' };
  }

  // 2. Check Authorization Bearer header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (token) {
    try {
      const client = getSupabaseAdminClient();
      const {
        data: { user },
        error,
      } = await client.auth.getUser(token);
      if (!error && user) {
        const { data: profile } = await client
          .from('profiles')
          .select('is_admin, email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.is_admin) {
          return { authorized: true, operatorEmail: profile.email ?? user.email };
        }
      }
    } catch {
      // Fall through
    }
  }

  // 3. Check Supabase cookies if present
  const cookies = request.cookies.getAll();
  const tokenCookie = cookies.find(
    (c) =>
      c.name.includes('-auth-token') ||
      c.name === 'sb-access-token' ||
      c.name === 'supabase-auth-token',
  );

  if (tokenCookie) {
    try {
      let accessToken = tokenCookie.value;
      if (accessToken.startsWith('[') || accessToken.startsWith('{')) {
        const parsed = JSON.parse(accessToken);
        accessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
      }
      if (accessToken) {
        const client = getSupabaseAdminClient();
        const {
          data: { user },
          error,
        } = await client.auth.getUser(accessToken);
        if (!error && user) {
          const { data: profile } = await client
            .from('profiles')
            .select('is_admin, email')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile?.is_admin) {
            return {
              authorized: true,
              operatorEmail: profile.email ?? user.email,
            };
          }
        }
      }
    } catch {
      // Fall through
    }
  }

  // In test or non-production environment, allow if COMMERCE_OPERATIONS_SECRET is not configured or in dev
  if (
    process.env.NODE_ENV !== 'production' &&
    (!process.env.COMMERCE_OPERATIONS_SECRET ||
      process.env.COMMERCE_DEV_ADMIN_ALLOW === 'true')
  ) {
    return { authorized: true, operatorEmail: 'dev-operator@printme.ai' };
  }

  return { authorized: false, reason: 'UNAUTHORIZED_OPERATOR' };
}
