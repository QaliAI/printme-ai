import 'server-only';

import { type NextRequest } from 'next/server';
import { hasCommerceOperationsAccess } from './operations-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/** Operations secret or verified bearer identity on a server-owned allowlist. */
export async function verifyAdminOrOperationsAccess(
  request: NextRequest,
): Promise<{ authorized: boolean; operatorEmail?: string; reason?: string }> {
  if (hasCommerceOperationsAccess(request)) {
    return { authorized: true, operatorEmail: 'system-operations' };
  }
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  if (token && allowed.length) {
    try {
      const { data: { user }, error } = await getSupabaseAdminClient().auth.getUser(token);
      if (!error && user?.email_confirmed_at && user.email && allowed.includes(user.email.toLowerCase())) {
        return { authorized: true, operatorEmail: user.email };
      }
    } catch { /* Fail closed when identity verification is unavailable. */ }
  }
  return { authorized: false, reason: 'UNAUTHORIZED_OPERATOR' };
}
