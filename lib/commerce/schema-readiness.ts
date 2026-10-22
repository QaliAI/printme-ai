import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export class CommerceSchemaNotReadyError extends Error {
  readonly code = 'COMMERCE_SCHEMA_NOT_READY';

  constructor() {
    super('Commerce recovery is disabled until the database capability check succeeds.');
    this.name = 'CommerceSchemaNotReadyError';
  }
}

/**
 * Discover the migration marker without invoking an RPC absent on schema 014.
 * The marker is installed atomically with migration 015 and checks its guards.
 * No positive cache: a reverted/unavailable database must close the gate again.
 * Flags permit checkout; they cannot assert database compatibility.
 */
export async function assertCommerceRecoverySchema(): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new CommerceSchemaNotReadyError();
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new CommerceSchemaNotReadyError();
    const schema: unknown = await response.json();
    if (!schema || typeof schema !== 'object' || !('paths' in schema)) throw new CommerceSchemaNotReadyError();
    const paths = schema.paths;
    if (!paths || typeof paths !== 'object' || !('/rpc/commerce_recovery_schema_version' in paths)) {
      throw new CommerceSchemaNotReadyError();
    }
    const { data, error } = await getSupabaseAdminClient().rpc('commerce_recovery_schema_version');
    if (error || data !== 15) throw new CommerceSchemaNotReadyError();
  } catch {
    // Never expose infrastructure responses or credentials to a caller.
    throw new CommerceSchemaNotReadyError();
  }
}
