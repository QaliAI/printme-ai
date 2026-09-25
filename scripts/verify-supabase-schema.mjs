import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      if (line.trim().startsWith('#') || !line.includes('=')) return;
      const index = line.indexOf('=');
      const key = line.substring(0, index).trim();
      let value = line.substring(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key) process.env[key] = value;
    });
  }
}

loadEnvFile('.env.local');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  'orders',
  'order_items',
  'carts',
  'cart_items',
  'mockup_cache',
  'catalog_blueprints',
  'catalog_print_providers',
  'catalog_provider_variants',
  'curated_designs',
  'design_versions',
  'commerce_checkout_sessions',
  'commerce_webhook_events',
  'fulfillment_jobs',
  'fulfillment_attempts',
  'analytics_events',
  'studio_design_drafts',
];

const RPCS = [
  'begin_commerce_webhook_event',
  'finish_commerce_webhook_event',
  'create_commerce_pending_order',
  'complete_stripe_checkout_payment',
  'lock_fulfillment_job',
  'apply_printify_order_transition',
];

async function verifySchema() {
  console.log('============================================================');
  console.log('PRINTME.AI — SUPABASE COMMERCE SCHEMA HEALTH CHECK');
  console.log(`Target URL: ${supabaseUrl}`);
  console.log('============================================================\n');

  let missingTables = 0;
  let existingTables = 0;

  console.log('--- 1. TABLE CHECK ---');
  for (const table of TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`[MISSING] ${table.padEnd(30)}: ${error.message}`);
      missingTables++;
    } else {
      console.log(`[EXISTS ] ${table.padEnd(30)}: Healthy (row count: ${count ?? 0})`);
      existingTables++;
    }
  }

  console.log('\n--- 2. RPC / FUNCTION CHECK ---');
  let missingRpcs = 0;
  const probeArgs = {
    begin_commerce_webhook_event: { p_source: 'stripe', p_event_id: 'probe', p_event_type: 'probe', p_payload: {} },
    finish_commerce_webhook_event: { p_source: 'stripe', p_event_id: 'probe', p_status: 'failed', p_error_code: null, p_error_message: '' },
    create_commerce_pending_order: { p_cart_id: '00000000-0000-0000-0000-000000000000', p_user_id: null, p_guest_token_hash: 'probe', p_idempotency_key: 'probe' },
    complete_stripe_checkout_payment: { p_event_id: 'probe', p_stripe_session_id: 'probe', p_payment_intent_id: 'probe', p_customer_email: 'probe@example.com', p_shipping_address: {}, p_paid_amount: 100, p_currency: 'USD' },
    lock_fulfillment_job: { p_order_id: '00000000-0000-0000-0000-000000000000', p_worker_id: 'probe', p_mode: 'manual_review' },
    apply_printify_order_transition: { p_event_id: 'probe', p_printify_order_id: 'probe', p_next_status: 'shipped', p_tracking_number: null, p_tracking_carrier: null, p_tracking_url: null, p_occurred_at: new Date().toISOString() },
  };

  for (const rpc of RPCS) {
    const args = probeArgs[rpc] || {};
    const { error } = await supabase.rpc(rpc, args);
    // If the function doesn't exist, Postgres returns code 42883 or PGRST202
    if (error && (error.code === '42883' || error.code === 'PGRST202' || error.message.includes('Could not find the function'))) {
      console.log(`[MISSING] rpc: ${rpc.padEnd(35)}: Not found in database schema`);
      missingRpcs++;
    } else {
      console.log(`[EXISTS ] rpc: ${rpc.padEnd(35)}: Function present`);
    }
  }

  console.log('\n============================================================');
  console.log(`SUMMARY: ${existingTables}/${TABLES.length} tables present, ${missingTables} missing.`);
  console.log(`RPCs: ${RPCS.length - missingRpcs}/${RPCS.length} present, ${missingRpcs} missing.`);
  if (missingTables > 0 || missingRpcs > 0) {
    console.log('\nACTION REQUIRED: Apply docs/MIGRATIONS_002_TO_009_BUNDLE.sql');
    console.log('via Supabase Dashboard SQL Editor -> Project vfgbvnfhvjmkmfmianpb.');
  } else {
    console.log('\nSUCCESS: Database schema is 100% commerce-ready!');
  }
  console.log('============================================================');
}

verifySchema().catch((err) => {
  console.error('Schema check crashed:', err);
  process.exit(1);
});
