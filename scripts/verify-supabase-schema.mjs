// Read-only health check. Run: node --env-file=.env.local scripts/verify-supabase-schema.mjs
// RPC existence is checked in REST metadata, never by executing commerce RPCs.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (url !== 'https://vfgbvnfhvjmkmfmianpb.supabase.co' || !key) {
  throw new Error('Canonical Supabase URL and service role configuration are required.');
}
const tables = ['orders', 'order_items', 'carts', 'cart_items', 'mockup_cache',
  'catalog_blueprints', 'catalog_print_providers', 'catalog_provider_variants',
  'curated_designs', 'commerce_designs', 'commerce_design_assets', 'commerce_design_versions',
  'commerce_product_configurations', 'product_configuration_snapshots', 'commerce_preview_results',
  'commerce_checkout_sessions', 'commerce_webhook_events', 'fulfillment_jobs',
  'fulfillment_attempts', 'analytics_events', 'studio_design_drafts', 'commerce_notification_outbox'];
const rpcs = ['begin_commerce_webhook_event', 'finish_commerce_webhook_event',
  'create_commerce_pending_order', 'complete_stripe_checkout_payment',
  'lock_fulfillment_job', 'apply_printify_order_transition'];
try {
  const response = await fetch(url + '/rest/v1/', {
    headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/openapi+json' },
    signal: AbortSignal.timeout(15_000),
  });
  const schema = response.ok ? await response.json() : null;
  // HEAD responses can omit PostgREST's error body. Do not treat an empty
  // successful SDK result as evidence that a missing relation exists.
  const results = tables.map(table => ({ table, exposed: schema ? Boolean(schema.paths?.['/' + table]) : null }));
  const functions = rpcs.map(name => ({ name, exposed: schema ? Boolean(schema.paths?.['/rpc/' + name]) : null }));
  console.log(JSON.stringify({ project: 'vfgbvnfhvjmkmfmianpb', writes: 0, tables: results, functions,
    metadataHttpStatus: response.status, note: 'Audit RLS, columns, constraints and migration history separately; see docs/revenue-activation-2026-10-11.md.' }, null, 2));
  if (results.some(result => result.exposed !== true) || functions.some(fn => fn.exposed !== true)) process.exitCode = 1;
} catch {
  console.error('Read-only schema verification failed. Check canonical project connectivity and configuration.');
  process.exitCode = 1;
}
