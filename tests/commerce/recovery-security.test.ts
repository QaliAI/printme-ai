import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), recordPaymentHold: vi.fn(), completeEvent: vi.fn(),
}));
vi.mock('@/lib/commerce/schema-readiness', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/commerce/schema-readiness')>(),
  assertCommerceRecoverySchema: async () => undefined,
}));
vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdminClient: () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }));
vi.mock('@/lib/commerce/checkout/supabase-webhook-store', () => ({
  SupabaseStripeWebhookStore: class {
    beginEvent = async () => true;
    recordPaymentHold = mocks.recordPaymentHold;
    completeEvent = mocks.completeEvent;
    failEvent = async () => undefined;
  },
}));
import { verifyAdminOrOperationsAccess } from '@/lib/commerce/admin-auth';
import { GET as operations } from '@/app/api/commerce/operations/route';
import { POST as retryNotification } from '@/app/api/admin/orders/[orderId]/notification/route';
import { POST as stripeWebhook } from '@/app/api/webhooks/stripe/route';
import { getCheckoutConfirmation } from '@/lib/commerce/checkout/confirmation';
import { NotificationOutboxService } from '@/lib/notifications/outbox';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('COMMERCE_OPERATIONS_SECRET', '');
  vi.stubEnv('ADMIN_EMAILS', 'owner@example.test');
});
afterEach(() => vi.unstubAllEnvs());

describe('commerce recovery authorization', () => {
  it('fails closed with no credentials even in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const request = new NextRequest('http://localhost/api/admin/orders');
    expect((await verifyAdminOrOperationsAccess(request)).authorized).toBe(false);
    expect((await operations(request)).status).toBe(401);
    expect((await retryNotification(request, { params: Promise.resolve({ orderId: 'bad' }) })).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('ignores user-editable profile admin privileges and requires verified server allowlist membership', async () => {
    const request = new NextRequest('http://localhost/api/admin/orders', { headers: { authorization: 'Bearer verified-token' } });
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'attacker@example.test', email_confirmed_at: 'now' } }, error: null });
    expect((await verifyAdminOrOperationsAccess(request)).authorized).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'owner@example.test' } }, error: null });
    expect((await verifyAdminOrOperationsAccess(request)).authorized).toBe(false);
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'owner@example.test', email_confirmed_at: 'now' } }, error: null });
    expect(await verifyAdminOrOperationsAccess(request)).toMatchObject({ authorized: true, operatorEmail: 'owner@example.test' });
  });

  it('does not accept ambient cookies as production approval credentials', async () => {
    const request = new NextRequest('http://localhost/api/admin/orders', { headers: { cookie: 'sb-access-token=some-token' } });
    expect((await verifyAdminOrOperationsAccess(request)).authorized).toBe(false);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('shows paid order status during the checkout kill switch and treats DB failure as pending', async () => {
    vi.stubEnv('COMMERCE_PERSISTENCE_ENABLED', 'true');
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'false');
    vi.stubEnv('COMMERCE_E2E_TEST_MODE', 'false');
    const rows = [
      { order_id: '22222222-2222-4222-8222-222222222222', status: 'paid' },
      { id: '22222222-2222-4222-8222-222222222222', payment_status: 'paid' },
    ];
    mocks.from.mockImplementation(() => {
      const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: rows.shift(), error: null }) };
      return query;
    });
    expect(await getCheckoutConfirmation('cs_fixture')).toMatchObject({ verified: true });
    mocks.from.mockImplementation(() => { throw new Error('DB unavailable'); });
    expect(await getCheckoutConfirmation('cs_fixture')).toBeNull();
    await expect(new NotificationOutboxService().isAlreadyDelivered('key')).rejects.toThrow('DB unavailable');
  });

  it('keeps delivered notifications terminal when a late worker reports failure', async () => {
    vi.stubEnv('COMMERCE_PERSISTENCE_ENABLED', 'false');
    const outbox = new NotificationOutboxService();
    await outbox.recordSending({ orderId: 'late-worker-order', eventType: 'order_confirmed', recipient: 'buyer@example.test', idempotencyKey: 'late-worker-key', payload: {} });
    await outbox.recordSuccess('late-worker-key', 'provider-id');
    await outbox.recordFailure('late-worker-key', 'late failure');
    expect(await outbox.isAlreadyDelivered('late-worker-key')).toBe(true);
  });
});

describe('signed receipts remain available while new checkout is disabled', () => {
  function signedRequest(livemode: boolean) {
    const payload = JSON.stringify({ id: 'evt_refund_fixture', object: 'event', livemode, type: 'charge.refunded', data: { object: { payment_intent: 'pi_fixture', amount_refunded: 4103 } } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fixture' });
    return new NextRequest('http://localhost/api/webhooks/stripe', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } });
  }

  it('processes matching live refunds without enabling checkout or production submission', async () => {
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'false');
    vi.stubEnv('COMMERCE_PERSISTENCE_ENABLED', 'true');
    vi.stubEnv('STRIPE_MODE', 'live');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_fixture');
    vi.stubEnv('STRIPE_LIVE_RELEASE_APPROVED', 'false');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture');
    const response = await stripeWebhook(signedRequest(true));
    expect(response.status).toBe(200);
    expect(mocks.recordPaymentHold).toHaveBeenCalledWith({ eventId: 'evt_refund_fixture', paymentIntentId: 'pi_fixture', reason: 'refund', refundedAmount: 4103 });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects the wrong account mode before storing it', async () => {
    vi.stubEnv('COMMERCE_PERSISTENCE_ENABLED', 'true'); vi.stubEnv('STRIPE_MODE', 'test');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture'); vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture');
    expect((await stripeWebhook(signedRequest(true))).status).toBe(400);
    expect(mocks.recordPaymentHold).not.toHaveBeenCalled();
  });
});
