import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isStripeEventModeMismatch,
  StripeCheckoutWebhookService,
  type StripeWebhookStore,
} from '@/lib/commerce/checkout/stripe-webhook';
import type { CartConfigurationSnapshot } from '@/lib/commerce/types';

const createSession = vi.hoisted(() =>
  vi.fn(async () => ({ id: 'cs_test_fixture', url: 'https://checkout.stripe.test/cs_test_fixture' })),
);
vi.mock('stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('stripe')>();
  class FakeStripe extends actual.default {
    constructor(...args: ConstructorParameters<typeof actual.default>) {
      super(...args);
      (this as unknown as { checkout: unknown }).checkout = { sessions: { create: createSession } };
    }
  }
  return { ...actual, default: FakeStripe };
});

afterEach(() => {
  vi.unstubAllEnvs();
  createSession.mockClear();
});

describe('B3: webhook livemode must match STRIPE_MODE', () => {
  it('accepts matching modes and rejects mismatches', () => {
    expect(isStripeEventModeMismatch({ livemode: false }, 'test')).toBe(false);
    expect(isStripeEventModeMismatch({ livemode: true }, 'live')).toBe(false);
    expect(isStripeEventModeMismatch({ livemode: true }, 'test')).toBe(true);
    expect(isStripeEventModeMismatch({ livemode: false }, 'live')).toBe(true);
  });

  it('treats an unset STRIPE_MODE as test, like the gateway does', () => {
    expect(isStripeEventModeMismatch({ livemode: false }, undefined)).toBe(false);
    expect(isStripeEventModeMismatch({ livemode: true }, undefined)).toBe(true);
  });
});

class RecordingWebhookStore implements StripeWebhookStore {
  async closeCheckout(input: Parameters<StripeWebhookStore['closeCheckout']>[0]) { this.completedEvents.push(input.eventId); }
  async recordPaymentHold() {}

  completedEvents: string[] = [];
  payments = 0;
  async beginEvent(_event: Stripe.Event): Promise<boolean> {
    return true;
  }
  async claimFailedEvent(_eventId: string): Promise<Stripe.Event | null> {
    return null;
  }
  async completeEvent(eventId: string) {
    this.completedEvents.push(eventId);
  }
  async failEvent() {}
  async completePayment() {
    this.payments += 1;
    return 'order-id';
  }
}

function sessionEvent(type: string, paymentStatus: string): Stripe.Event {
  return {
    id: `evt_${type}_${paymentStatus}`,
    object: 'event',
    type,
    livemode: false,
    data: { object: { id: 'cs_test_fixture', object: 'checkout.session', payment_status: paymentStatus } },
  } as unknown as Stripe.Event;
}

describe('Stripe failed receipt redelivery', () => {
  it('reclaims failed events exactly once without reprocessing successful receipts', async () => {
    const failed = sessionEvent('checkout.session.expired', 'unpaid');
    const store = new RecordingWebhookStore();
    let claims = 0;
    store.beginEvent = async () => false;
    store.claimFailedEvent = async (id) => {
      if (id !== failed.id || claims++ > 0) return null;
      return failed;
    };
    const service = new StripeCheckoutWebhookService(store);

    expect(await service.process(failed)).toEqual({ duplicate: false, orderId: null });
    expect(await service.process(failed)).toEqual({ duplicate: true, orderId: null });
    expect(store.completedEvents).toEqual([failed.id]);
    expect(store.payments).toBe(0);
  });
});

describe('failed and unpaid Stripe events never mark an order paid', () => {
  it.each([
    ['checkout.session.async_payment_failed', 'unpaid'],
    ['checkout.session.expired', 'unpaid'],
    ['checkout.session.completed', 'unpaid'],
    ['checkout.session.async_payment_succeeded', 'unpaid'],
    ['payment_intent.payment_failed', 'unpaid'],
  ])('%s (%s) settles the event without a payment', async (type, status) => {
    const store = new RecordingWebhookStore();
    const result = await new StripeCheckoutWebhookService(store).process(sessionEvent(type, status));
    expect(result).toEqual({ duplicate: false, orderId: null });
    expect(store.payments).toBe(0);
    expect(store.completedEvents).toEqual([`evt_${type}_${status}`]);
  });
});

describe('Stripe Checkout session payload', () => {
  function item(): CartConfigurationSnapshot {
    return {
      quantity: 1,
      designTitle: 'Fixture',
      productTitle: 'Everyday Tee',
      variantTitle: 'White / L',
      configurationHash: 'hash',
      configuration: { currency: 'USD', unitPrice: 3400 },
    } as unknown as CartConfigurationSnapshot;
  }

  it('makes shipping tax-exclusive with the shipping tax code, like the line items', async () => {
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'true');
    vi.stubEnv('COMMERCE_PERSISTENCE_ENABLED', 'true');
    vi.stubEnv('STRIPE_MODE', 'test');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3100');
    const { StripeTestCheckoutGateway } = await import('@/lib/commerce/checkout/stripe-gateway');

    await new StripeTestCheckoutGateway().createSession({
      orderId: 'order-1',
      checkoutId: 'checkout-1',
      idempotencyKey: 'idem-1',
      items: [item()],
      shippingFeeCents: 399,
    });

    expect(createSession).toHaveBeenCalledTimes(1);
    const params = (createSession.mock.calls[0] as unknown as [Stripe.Checkout.SessionCreateParams])[0];
    expect(params.automatic_tax).toEqual({ enabled: true });
    expect(params.line_items?.[0].price_data?.tax_behavior).toBe('exclusive');
    const rate = params.shipping_options?.[0].shipping_rate_data;
    expect(rate?.fixed_amount).toEqual({ amount: 399, currency: 'usd' });
    expect(rate?.tax_behavior).toBe('exclusive');
    expect(rate?.tax_code).toBe('txcd_92010001');
  });

  it('refuses to create a session while checkout is disabled', async () => {
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'false');
    const { StripeTestCheckoutGateway } = await import('@/lib/commerce/checkout/stripe-gateway');
    await expect(
      new StripeTestCheckoutGateway().createSession({
        orderId: 'order-1',
        checkoutId: 'checkout-1',
        idempotencyKey: 'idem-1',
        items: [item()],
      }),
    ).rejects.toThrow(/disabled/);
    expect(createSession).not.toHaveBeenCalled();
  });
});

const root = process.cwd();
const canonical = readFileSync(
  path.join(root, 'docs/launch/01_CANONICAL_LAUNCH_MIGRATION_vfgbvnfhvjmkmfmianpb.sql'),
  'utf8',
);
const migrationFiles = readdirSync(path.join(root, 'migrations'))
  .filter((name) => name.endsWith('.sql'))
  .sort();
const migrations = migrationFiles.map((name) => readFileSync(path.join(root, 'migrations', name), 'utf8')).join('\n');

/** Names of SECURITY DEFINER functions callable as RPCs (trigger functions excluded). */
function securityDefinerRpcs(sql: string) {
  const names = new Set<string>();
  const pattern = /CREATE OR REPLACE FUNCTION\s+(\w+)\s*\(([\s\S]*?)\bAS \$\$/g;
  for (const match of sql.matchAll(pattern)) {
    const header = match[2];
    if (/SECURITY DEFINER/.test(header) && !/RETURNS\s+TRIGGER/i.test(header)) names.add(match[1]);
  }
  return [...names].sort();
}

function grantsOnlyServiceRole(sql: string, name: string) {
  const fn = `ON FUNCTION ${name}\\s*\\([^)]*\\)\\s*`;
  return (
    new RegExp(`REVOKE ALL ${fn}FROM PUBLIC,\\s*anon,\\s*authenticated;`).test(sql) &&
    new RegExp(`GRANT EXECUTE ${fn}TO service_role;`).test(sql)
  );
}

describe('commerce RPCs are callable only by service_role', () => {
  it('finds the commerce RPCs in both the migrations and the canonical launch migration', () => {
    const expected = [
      'apply_printify_order_transition',
      'begin_commerce_production_submission',
      'claim_commerce_notification',
      'attach_commerce_stripe_session',
      'begin_commerce_webhook_event',
      'claim_failed_commerce_webhook_event',
      'close_commerce_checkout',
      'complete_stripe_checkout_payment',
      'commerce_recovery_schema_version',
      'create_commerce_pending_order',
      'finish_commerce_webhook_event',
      'lock_fulfillment_job',
      'record_stripe_payment_hold',
    ].sort();
    expect(securityDefinerRpcs(canonical)).toEqual(expected);
    // Pets is a separately authorized optional ledger, outside the commerce bundle.
    expect(securityDefinerRpcs(migrations)).toEqual([...expected,
      'finish_pets_generation', 'pets_generation_ledger_version', 'reserve_pets_generation',
    ].sort());
  });

  it.each([
    ['canonical launch migration', canonical],
    ['migrations/', migrations],
  ])('%s revokes anon/authenticated and grants service_role for every RPC', (_label, sql) => {
    const exposed = securityDefinerRpcs(sql).filter((name) => !grantsOnlyServiceRole(sql, name));
    expect(exposed).toEqual([]);
  });

  it('keeps migration 014 and the canonical section 014 identical', () => {
    const statements = (sql: string) =>
      [...sql.matchAll(/^(?:REVOKE|GRANT)\b[\s\S]*?;/gm)].map((match) => match[0].replace(/\s+/g, ' '));
    const fix = readFileSync(path.join(root, 'migrations/014_restrict_commerce_rpcs_to_service_role.sql'), 'utf8');
    const section = canonical.slice(canonical.indexOf('SECTION 014'), canonical.indexOf('SECTION 015'));
    expect(statements(fix)).toHaveLength(12);
    expect(statements(section)).toEqual(statements(fix));
  });
});

describe('already-paid orders are never paid twice (013 guard)', () => {
  const fix = readFileSync(path.join(root, 'migrations/013_fix_checkout_paid_totals.sql'), 'utf8');
  const complete = fix.slice(fix.indexOf('-- RPC: complete_stripe_checkout_payment'));

  it('checks payment_status before rewriting the order', () => {
    const guard = complete.indexOf("IF target_order.payment_status <> 'unpaid' THEN");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(complete.indexOf('UPDATE orders'));
    expect(complete).toMatch(
      /stripe_payment_intent_id IS DISTINCT FROM p_payment_intent_id THEN\s+RAISE EXCEPTION 'order already paid by another payment'/,
    );
  });

  it('settles a replay of the same payment without touching the order', () => {
    const guardBlock = complete.slice(
      complete.indexOf("IF target_order.payment_status <> 'unpaid' THEN"),
      complete.indexOf('RETURN target_order.id;') + 'RETURN target_order.id;'.length,
    );
    expect(guardBlock).toMatch(/UPDATE commerce_webhook_events/);
    expect(guardBlock).not.toMatch(/UPDATE orders/);
  });
});
vi.mock('@/lib/commerce/schema-readiness', () => ({ assertCommerceRecoverySchema: async () => undefined }));
