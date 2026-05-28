import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use a safe placeholder URL during build when env vars aren't set
// At runtime in production, real env vars will be present.
const SAFE_URL = supabaseUrl || 'https://placeholder.supabase.co';
const SAFE_KEY = supabaseAnonKey || 'placeholder-anon-key';

// Client for browser (limited access via RLS)
export const supabase: SupabaseClient = createClient(SAFE_URL, SAFE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Server client (full access, use only on backend)
export const supabaseAdmin: SupabaseClient = createClient(
  SAFE_URL,
  supabaseServiceKey || SAFE_KEY
);

// Validation helper - call this from runtime code paths that need real Supabase
export function validateSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
