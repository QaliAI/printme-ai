import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import type Stripe from 'stripe';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeCheckoutWebhookService, type StripeWebhookStore } from '@/lib/commerce/checkout/stripe-webhook';

const sql = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const recovery = sql('migrations/015_commerce_payment_recovery.sql');
let db: PGlite;
const cartId = '11111111-1111-4111-8111-111111111111';
const orderId = '22222222-2222-4222-8222-222222222222';
const checkoutId = '33333333-3333-4333-8333-333333333333';

class PgWebhookStore implements StripeWebhookStore {
  async beginEvent(event: Stripe.Event) {
    return (await db.query<{ ok: boolean }>('SELECT begin_commerce_webhook_event($1,$2,$3,$4) ok', ['stripe', event.id, event.type, event])).rows[0].ok;
  }
  async claimFailedEvent(id: string) {
    return (await db.query<{ payload: Stripe.Event }>('SELECT * FROM claim_failed_commerce_webhook_event($1,$2)', ['stripe', id])).rows[0]?.payload ?? null;
  }
  async closeCheckout(input: Parameters<StripeWebhookStore['closeCheckout']>[0]) {
    await db.query('SELECT close_commerce_checkout($1,$2,$3)',[input.eventId,input.stripeSessionId,input.reason]);
  }
  async completeEvent(id: string) {
    await db.query("SELECT finish_commerce_webhook_event('stripe',$1,'processed',NULL,'')", [id]);
  }
  async failEvent(id: string, code: string, message: string) {
    await db.query("SELECT finish_commerce_webhook_event('stripe',$1,'failed',$2,$3)", [id, code, message]);
  }
  async completePayment(input: Parameters<StripeWebhookStore['completePayment']>[0]) {
    const result = await db.query<{ id: string }>('SELECT complete_stripe_checkout_payment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) id', [
      input.eventId,input.stripeSessionId,input.paymentIntentId,input.customerEmail,input.shippingAddress,
      input.paidAmount,input.currency,input.amountSubtotal,input.amountShipping,input.amountTax,input.amountDiscount,
    ]);
    return result.rows[0].id;
  }
  async recordPaymentHold(input: Parameters<StripeWebhookStore['recordPaymentHold']>[0]) {
    await db.query('SELECT record_stripe_payment_hold($1,$2,$3,$4)', [input.eventId,input.paymentIntentId,input.reason,input.refundedAmount]);
  }
}

function event(type = 'checkout.session.completed', object?: Record<string, unknown>): Stripe.Event {
  return {
    id: `evt_${randomUUID()}`, object: 'event', type, livemode: false,
    data: { object: object ?? {
      id: 'cs_fixture', payment_status: 'paid', payment_intent: 'pi_fixture', currency: 'usd',
      amount_subtotal: 3400, amount_total: 4103,
      total_details: { amount_shipping: 399, amount_tax: 304, amount_discount: 0 },
      customer_details: { email: 'buyer@example.test' },
      collected_information: { shipping_details: { name: 'Buyer', address: { line1: '1 Test Street', city: 'Chicago', state: 'IL', postal_code: '60601', country: 'US' } } },
    } },
  } as unknown as Stripe.Event;
}
async function order() { return (await db.query<Record<string, unknown>>('SELECT * FROM orders WHERE id=$1', [orderId])).rows[0]; }
async function lock() { return db.query("SELECT * FROM lock_fulfillment_job($1,'worker','draft')", [orderId]); }

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id UUID PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE FUNCTION uuid_generate_v4() RETURNS UUID LANGUAGE sql AS 'SELECT gen_random_uuid()';
    CREATE TABLE profiles(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID,email TEXT,is_admin BOOLEAN DEFAULT false);`);
  const canonical = sql('docs/launch/01_CANONICAL_LAUNCH_MIGRATION_vfgbvnfhvjmkmfmianpb.sql');
  await db.exec(canonical.slice(canonical.indexOf('CREATE TABLE IF NOT EXISTS carts'), canonical.indexOf('-- SECTION 002')));
  await db.exec(`ALTER TABLE carts ADD COLUMN guest_token_hash TEXT;
    ALTER TABLE cart_items ADD COLUMN configuration_snapshot JSONB, ADD COLUMN configuration_hash TEXT,
      ADD COLUMN snapshot_schema_version INTEGER, ADD COLUMN snapshot_created_at TIMESTAMPTZ;
    ALTER TABLE order_items ADD COLUMN configuration_snapshot JSONB, ADD COLUMN configuration_hash TEXT,
      ADD COLUMN snapshot_schema_version INTEGER, ADD COLUMN snapshot_created_at TIMESTAMPTZ;`);
  for (const name of ['005_add_secure_checkout','006_add_fulfillment_jobs','007_harden_commerce_webhooks','012_launch_fulfillment_and_notification_outbox','013_fix_checkout_paid_totals','014_restrict_commerce_rpcs_to_service_role']) {
    await db.exec(sql(`migrations/${name}.sql`));
  }
  await db.exec(recovery);
  // The upgrade itself must also be safe to re-run locally.
  await db.exec(recovery);
}, 30000);

beforeEach(async () => {
  vi.stubEnv('STRIPE_MODE', 'test');
  await db.exec('TRUNCATE carts,orders,profiles,commerce_payment_holds CASCADE;');
  await db.query("INSERT INTO carts(id,status,guest_token_hash) VALUES($1,'active','guest')", [cartId]);
  await db.query("INSERT INTO orders(id,cart_id,status,subtotal,shipping,tax,total,order_number) VALUES($1,$2,'pending_payment',3400,399,0,3799,'PM-FIXTURE')", [orderId,cartId]);
  await db.query("INSERT INTO commerce_checkout_sessions(id,order_id,cart_id,guest_token_hash,idempotency_key,stripe_session_id,status) VALUES($1,$2,$3,'guest','key','cs_fixture','redirect_ready')", [checkoutId,orderId,cartId]);
  await db.query(`INSERT INTO order_items(order_id,quantity,unit_price,configuration_snapshot,configuration_hash,snapshot_schema_version) VALUES($1,1,3400,'{"productTitle":"Tee"}','fixture',2)`,[orderId]);
  await db.query(`INSERT INTO cart_items(cart_id,quantity,unit_price,configuration_snapshot,configuration_hash,snapshot_schema_version)
    VALUES($1,1,3400,'{"productTitle":"Tee"}','fixture',2)`,[cartId]);
});
afterAll(async () => { vi.unstubAllEnvs(); await db?.close(); });

describe('database recovery capability marker', () => {
  it('proves all migration guards are active and restricts the handshake to service role', async () => {
    expect((await db.query<{ version: number }>('SELECT commerce_recovery_schema_version() version')).rows[0].version).toBe(15);
    await db.exec('ALTER TABLE orders DISABLE TRIGGER zz_orders_payment_hold');
    try {
      expect((await db.query<{ version: number }>('SELECT commerce_recovery_schema_version() version')).rows[0].version).toBe(0);
    } finally { await db.exec('ALTER TABLE orders ENABLE TRIGGER zz_orders_payment_hold'); }
    for (const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try { await expect(db.query('SELECT commerce_recovery_schema_version()')).rejects.toThrow(/permission denied/); }
      finally { await db.exec('RESET ROLE'); }
    }
    await db.exec('SET ROLE service_role');
    try {
      expect((await db.query<{ version: number }>('SELECT commerce_recovery_schema_version() version')).rows[0].version).toBe(15);
    } finally { await db.exec('RESET ROLE'); }
  });
});

describe('real PostgreSQL payment recovery (no external services)', () => {
  it('ships the identical upgrade in the canonical reference and limits every RPC', async () => {
    const canonical = sql('docs/launch/01_CANONICAL_LAUNCH_MIGRATION_vfgbvnfhvjmkmfmianpb.sql');
    expect(canonical.slice(canonical.indexOf('-- Depends on reconciled commerce schema through 014.'), canonical.indexOf('-- SECTION 016')).trim()).toBe(recovery.trim());
    const exposed=await db.query(`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.prosecdef AND p.prorettype<>'trigger'::regtype
        AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))`);
    expect(exposed.rows).toEqual([]);
  });

  it('persists shipping + tax, one job and durable email atomically; duplicate and delayed success do not duplicate them', async () => {
    const service = new StripeCheckoutWebhookService(new PgWebhookStore());
    const paid = event();
    await service.process(paid);
    expect(await service.process(paid)).toEqual({ duplicate: true, orderId: null });
    await service.process(event('checkout.session.async_payment_succeeded'));
    expect(await order()).toMatchObject({ payment_status: 'paid', paid_amount: 4103, total: '4103.00', tax: '304.00' });
    for (const table of ['fulfillment_jobs','commerce_notification_outbox']) {
      expect((await db.query<{ count: number }>(`SELECT count(*)::integer count FROM ${table}`)).rows[0].count).toBe(1);
    }
    const payload = (await db.query<{ payload: Record<string, unknown> }>('SELECT payload FROM commerce_notification_outbox')).rows[0].payload;
    expect(payload).toMatchObject({ totalCents: 4103, shippingCents: 399, taxCents: 304, items: [{ title: 'Tee', quantity: 1, unitPriceCents: 3400 }] });
  });

  it('closes unpaid expired checkout, records a late payment for review, and never cancels an already-paid order', async () => {
    const service = new StripeCheckoutWebhookService(new PgWebhookStore());
    await service.process(event('checkout.session.expired',{id:'cs_fixture'}));
    expect((await order()).status).toBe('cancelled');
    await service.process(event());
    expect(await order()).toMatchObject({payment_status:'paid',status:'needs_review',fulfillment_status:'cancelled'});
    await expect(lock()).rejects.toThrow('unheld order');
    await service.process(event('checkout.session.async_payment_failed',{id:'cs_fixture'}));
    expect((await order()).payment_status).toBe('paid');
  });

  it('waits for delayed payment and rejects mismatched totals without changing the order', async () => {
    const service = new StripeCheckoutWebhookService(new PgWebhookStore());
    const unpaid = event(); (unpaid.data.object as Stripe.Checkout.Session).payment_status = 'unpaid';
    await service.process(unpaid);
    expect((await order()).payment_status).toBe('unpaid');
    const bad = event(); (bad.data.object as Stripe.Checkout.Session).amount_total = 1;
    await expect(service.process(bad)).rejects.toThrow();
    expect((await order()).payment_status).toBe('unpaid');
    await service.process(event('checkout.session.async_payment_succeeded'));
    expect((await order()).payment_status).toBe('paid');
  });

  it('recovers a lost DB acknowledgement after commit without charging or inserting twice', async () => {
    const store = new PgWebhookStore();
    const complete = store.completePayment.bind(store);
    store.completePayment = async input => { await complete(input); throw new Error('connection lost after commit'); };
    const service = new StripeCheckoutWebhookService(store); const paid = event();
    await expect(service.process(paid)).rejects.toThrow('connection lost');
    expect((await order()).payment_status).toBe('paid');
    expect(await service.process(paid)).toMatchObject({ duplicate: true });
    expect((await db.query('SELECT * FROM commerce_notification_outbox')).rows).toHaveLength(1);
  });

  it('returns retryable failure for an active receipt; reclaims a crashed worker once after lease expiry', async () => {
    const store = new PgWebhookStore(); const paid = event();
    await store.beginEvent(paid);
    await expect(new StripeCheckoutWebhookService(store).process(paid)).rejects.toThrow('in progress');
    await db.query("UPDATE commerce_webhook_events SET last_attempted_at=now()-interval '6 minutes' WHERE event_id=$1", [paid.id]);
    await new StripeCheckoutWebhookService(store).process(paid);
    expect((await order()).payment_status).toBe('paid');
    expect(await store.claimFailedEvent(paid.id)).toBeNull();
  });

  it.each([['charge.refunded', 'refunded', 4103], ['charge.refunded', 'partially_refunded', 500], ['refund.created','refund_pending',0], ['charge.dispute.created','disputed',0]])(
    '%s before checkout settlement prevents fulfillment (%s)', async (type, status, amount) => {
      const service = new StripeCheckoutWebhookService(new PgWebhookStore());
      await service.process(event(type,{ payment_intent:'pi_fixture',amount_refunded:amount }));
      await service.process(event());
      expect(await order()).toMatchObject({ payment_status: status, fulfillment_status:'cancelled' });
      await expect(lock()).rejects.toThrow('unheld order');
      await service.process(event('checkout.session.async_payment_succeeded'));
      expect((await order()).payment_status).toBe(status);
    },
  );

  it('keeps refund totals monotonic and dispute holds sticky across stale and closed events', async () => {
    const service = new StripeCheckoutWebhookService(new PgWebhookStore());
    await service.process(event());
    for (const amount of [500,4103,500]) await service.process(event('charge.refunded',{ payment_intent:'pi_fixture',amount_refunded:amount }));
    expect(await order()).toMatchObject({ payment_status:'refunded',refunded_amount:4103 });
    await service.process(event('charge.dispute.closed',{ payment_intent:'pi_fixture',status:'won' }));
    await service.process(event('refund.updated',{ payment_intent:'pi_fixture',status:'failed' }));
    expect((await order()).payment_status).toBe('disputed');
    await expect(lock()).rejects.toThrow();
  });

  it('refuses a conflicting PaymentIntent and preserves the first paid order', async () => {
    const service = new StripeCheckoutWebhookService(new PgWebhookStore());
    await service.process(event());
    const conflict=event(); (conflict.data.object as Stripe.Checkout.Session).payment_intent='pi_conflict';
    await expect(service.process(conflict)).rejects.toThrow('another payment');
    expect((await order()).stripe_payment_intent_id).toBe('pi_fixture');
  });

  it('admits draft production once, blocks an uncertain retry and blocks refund races at admission', async () => {
    const service = new StripeCheckoutWebhookService(new PgWebhookStore()); await service.process(event());
    await lock();
    const job=(await db.query<{ id:string }>('SELECT id FROM fulfillment_jobs')).rows[0].id;
    await db.query("UPDATE fulfillment_jobs SET state='manual_review_ready',printify_order_id='draft_1' WHERE id=$1",[job]);
    await db.query("SELECT begin_commerce_production_submission($1,'request_1')",[job]);
    await expect(db.query("SELECT begin_commerce_production_submission($1,'request_2')",[job])).rejects.toThrow('not ready');
    await db.query("UPDATE fulfillment_jobs SET state='fulfillment_failed',retry_classification='manual_review_uncertain_submission' WHERE id=$1",[job]);
    await expect(lock()).rejects.toThrow('reconciliation');
    await service.process(event('refund.created',{payment_intent:'pi_fixture'}));
    await db.query("UPDATE fulfillment_jobs SET state='fulfillment_ready' WHERE id=$1",[job]);
    expect((await db.query<{state:string}>('SELECT state FROM fulfillment_jobs')).rows[0].state).toBe('cancelled');
    await expect(db.query("SELECT begin_commerce_production_submission($1,'request_3')",[job])).rejects.toThrow('unheld order');
  });

  it('retries failed notification claims with increasing attempts and never reclaims a sent notification', async () => {
    await new StripeCheckoutWebhookService(new PgWebhookStore()).process(event());
    const claim=()=>db.query<{ok:boolean}>("SELECT claim_commerce_notification($1,'order_confirmed','buyer@example.test',$2,'{}') ok",[orderId,`order-confirmed-${orderId}`]);
    expect((await claim()).rows[0].ok).toBe(true);
    expect((await claim()).rows[0].ok).toBe(false);
    await db.exec("UPDATE commerce_notification_outbox SET status='failed';");
    expect((await claim()).rows[0].ok).toBe(true);
    expect((await db.query<{attempts:number}>('SELECT attempts FROM commerce_notification_outbox')).rows[0].attempts).toBe(2);
    await db.exec("UPDATE commerce_notification_outbox SET status='sent';");
    expect((await claim()).rows[0].ok).toBe(false);
  });

  it('reuses one pending order for simultaneous checkout keys on the same cart', async () => {
    await db.exec('TRUNCATE orders CASCADE');
    const results=await Promise.all(['key-a','key-b','key-a'].map(key=>db.query<{order_id:string}>("SELECT * FROM create_commerce_pending_order($1,NULL,'guest',$2,3400,'USD')",[cartId,key])));
    expect(new Set(results.map(result=>result.rows[0].order_id)).size).toBe(1);
    expect((await db.query('SELECT * FROM orders')).rows).toHaveLength(1);
    await db.query('UPDATE cart_items SET quantity=2 WHERE cart_id=$1',[cartId]);
    await expect(db.query("SELECT * FROM create_commerce_pending_order($1,NULL,'guest','key-c',6800,'USD')",[cartId])).rejects.toThrow('snapshot changed');
  });

  it.each(['anon','authenticated'])('denies %s commerce RPC calls and profile self-promotion',async role=>{
    await db.exec(`GRANT USAGE ON SCHEMA public TO ${role}; GRANT INSERT,UPDATE,SELECT ON profiles TO ${role}; SET ROLE ${role};`);
    try {
      await expect(db.query("SELECT record_stripe_payment_hold('evt_attack','pi_fixture','refund',1)")).rejects.toThrow('permission denied');
      await expect(db.query("SELECT * FROM lock_fulfillment_job($1,'attacker','live')",[orderId])).rejects.toThrow('permission denied');
      await expect(db.exec('INSERT INTO profiles(is_admin) VALUES(true)')).rejects.toThrow('admin assignment');
    } finally { await db.exec('RESET ROLE'); }
  });
});
