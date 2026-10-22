import Stripe from 'stripe';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertCommerceRecoverySchema } from '@/lib/commerce/schema-readiness';
import { SupabaseCheckoutStore } from '@/lib/commerce/checkout/supabase-store';
import { SupabaseFulfillmentStore } from '@/lib/commerce/fulfillment/supabase-store';
import { StripeTestCheckoutGateway } from '@/lib/commerce/checkout/stripe-gateway';
import { NotificationOutboxService } from '@/lib/notifications/outbox';
import { POST as stripeWebhook } from '@/app/api/webhooks/stripe/route';
import { POST as printifyWebhook } from '@/app/api/webhooks/printify/route';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdminClient: () => mocks }));
const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://database.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service_fixture');
  vi.stubEnv('COMMERCE_PERSISTENCE_ENABLED', 'true');
  vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'true');
  vi.stubEnv('COMMERCE_E2E_TEST_MODE', 'false');
  vi.stubEnv('STRIPE_MODE', 'test');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture');
  fetchMock.mockResolvedValue(Response.json({ paths: {} }));
  mocks.rpc.mockResolvedValue({ data: 15, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function readySchema() {
  fetchMock.mockImplementation(async () => Response.json({ paths: { '/rpc/commerce_recovery_schema_version': { post: {} } } }));
}

function receipt(signatureValid = true) {
  const payload = JSON.stringify({ id: 'evt_compatibility', object: 'event', livemode: false, type: 'charge.refunded', data: { object: { payment_intent: 'pi_fixture', amount_refunded: 4103 } } });
  const signature = signatureValid ? Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fixture' }) : 'invalid';
  return new NextRequest('http://localhost/api/webhooks/stripe', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } });
}

describe('commerce schema 014 compatibility', () => {
  it('discovers absence without invoking a missing RPC or column', async () => {
    await expect(assertCommerceRecoverySchema()).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('prevents checkout, fulfillment and email claims even when flags are enabled', async () => {
    await expect(new SupabaseCheckoutStore().loadActiveCart({ guestTokenHash: 'guest' })).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    await expect(new StripeTestCheckoutGateway().createSession({ orderId: 'order', checkoutId: 'checkout', idempotencyKey: 'key', items: [] })).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    await expect(new SupabaseFulfillmentStore().loadPaidOrder('order')).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    await expect(new NotificationOutboxService().recordSending({ eventType: 'order_confirmed', recipient: 'buyer@example.test', idempotencyKey: 'key', payload: {} })).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('keeps authenticated Stripe receipts retryable before database acknowledgement', async () => {
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'false');
    const response = await stripeWebhook(receipt());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('authenticates receipts before schema discovery', async () => {
    expect((await stripeWebhook(receipt(false))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('commerce schema capability proof', () => {
  it('requires a supported version and active guards, not only the advertised RPC', async () => {
    readySchema();
    for (const data of [0, 14, null, '15']) {
      mocks.rpc.mockResolvedValueOnce({ data, error: null });
      await expect(assertCommerceRecoverySchema()).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    }
    await expect(assertCommerceRecoverySchema()).resolves.toBeUndefined();
  });

  it('fails closed for failed discovery, stale schema cache and database errors', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(assertCommerceRecoverySchema()).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(assertCommerceRecoverySchema()).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    readySchema();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } });
    await expect(assertCommerceRecoverySchema()).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
  });

  it('does not cache prior readiness after a schema rollback', async () => {
    readySchema();
    await assertCommerceRecoverySchema();
    fetchMock.mockResolvedValue(Response.json({ paths: {} }));
    await expect(assertCommerceRecoverySchema()).rejects.toMatchObject({ code: 'COMMERCE_SCHEMA_NOT_READY' });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('preserves signed refund recovery on schema 015 with checkout disabled', async () => {
    readySchema();
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'false');
    mocks.rpc.mockImplementation(async (name: string) => ({
      data: name === 'commerce_recovery_schema_version' ? 15 : name === 'begin_commerce_webhook_event' ? true : null,
      error: null,
    }));
    expect((await stripeWebhook(receipt())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('record_stripe_payment_hold', expect.objectContaining({ p_event_id: 'evt_compatibility', p_refunded_amount: 4103 }));
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('preserves signed Printify receipt recovery while new checkout is disabled', async () => {
    readySchema();
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'false');
    vi.stubEnv('PRINTIFY_WEBHOOK_SECRET', 'printify_fixture');
    vi.stubEnv('PRINTIFY_SHOP_ID', '123');
    const payload = JSON.stringify({ id: 'pfy_fixture', type: 'unknown_event', created_at: '2026-10-22T00:00:00Z', resource: { id: 'provider_order', type: 'order', data: { shop_id: 123 } } });
    const signature = `sha256=${createHmac('sha256', 'printify_fixture').update(payload).digest('hex')}`;
    mocks.rpc.mockImplementation(async (name: string) => ({
      data: name === 'commerce_recovery_schema_version' ? 15 : name === 'begin_commerce_webhook_event' ? true : null,
      error: null,
    }));
    const request = new NextRequest('http://localhost/api/webhooks/printify', { method: 'POST', body: payload, headers: { 'x-pfy-signature': signature } });
    expect((await printifyWebhook(request)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('begin_commerce_webhook_event', expect.objectContaining({ p_source: 'printify', p_event_id: 'pfy_fixture' }));
  });
});
