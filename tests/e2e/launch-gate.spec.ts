/**
 * Launch gate #10 dry-run evidence.
 *
 * Runs only against a local dev server (see playwright.config.ts webServer):
 * the commerce e2e harness replaces Supabase, Stripe Checkout is intercepted,
 * and Printify runs in dry-run mode. It never talks to production, never
 * creates a Stripe session and never submits a Printify order.
 *
 * Run: npx playwright test tests/e2e/launch-gate.spec.ts
 * Evidence and go-live checklist: docs/launch/LAUNCH_GATE_10_EVIDENCE.md
 */
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

const e2eSecret = 'printme-local-e2e-secret';
const webhookSecret = 'whsec_local_e2e_only';

test.beforeEach(async ({ baseURL }) => {
  // Hard stop: this file must never be pointed at a deployed site.
  const host = new URL(baseURL ?? 'http://invalid').hostname;
  expect(['localhost', '127.0.0.1'], `launch-gate spec refused to run against ${host}`).toContain(host);
});

async function blockExternalCommerce(page: Page) {
  const external: string[] = [];
  await page.route(/https:\/\/(api\.stripe\.com|api\.printify\.com)\//, async (route) => {
    external.push(route.request().url());
    await route.abort();
  });
  await page.route('https://checkout.stripe.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<main><h1>Stripe test Checkout</h1><p>No charge was made.</p></main>' }),
  );
  return external;
}

async function e2eSession(context: BrowserContext) {
  const sessionKey = randomUUID();
  const cookie = { domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Strict' as const };
  await context.addCookies([
    { ...cookie, name: 'printme-e2e-secret', value: e2eSecret },
    { ...cookie, name: 'printme-e2e-session', value: sessionKey },
  ]);
  return sessionKey;
}

function e2eHeaders(sessionKey: string) {
  return { 'x-commerce-e2e-secret': e2eSecret, 'x-commerce-e2e-session': sessionKey };
}

function signedEvent(stripeSessionId: string, amountTotal: number, livemode = false) {
  const event = {
    id: `evt_gate_${randomUUID()}`,
    object: 'event',
    api_version: '2026-04-22.dahlia',
    created: Math.floor(Date.now() / 1000),
    livemode,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: 'checkout.session.completed',
    data: {
      object: {
        id: stripeSessionId,
        object: 'checkout.session',
        payment_status: 'paid',
        amount_total: amountTotal,
        currency: 'usd',
        payment_intent: `pi_test_gate_${randomUUID()}`,
        customer_details: { email: 'gate@example.test' },
        collected_information: {
          shipping_details: {
            name: 'Gate Tester',
            address: { line1: '1 Test Way', line2: null, city: 'Chicago', state: 'IL', postal_code: '60601', country: 'US' },
          },
        },
      },
    },
  };
  const body = JSON.stringify(event);
  const signature = new Stripe('sk_test_signature_fixture').webhooks.generateTestHeaderString({ payload: body, secret: webhookSecret });
  return { body, signature };
}

/** Adds one tee to an e2e cart, starts checkout (intercepted) and returns the fake session. */
async function dryRunCheckout(page: Page, context: BrowserContext, request: APIRequestContext) {
  const sessionKey = await e2eSession(context);
  const external = await blockExternalCommerce(page);
  await page.goto('/shop-v2');
  await page.getByTestId('open-design-design-autumn-state-of-mind').click();
  await page.getByTestId('product-switch-everyday-tee').click();
  await page.getByRole('button', { name: 'White / L' }).click();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-item')).toContainText('Everyday Tee');
  await page.getByTestId('begin-checkout').click();
  await expect(page.getByRole('heading', { name: 'Stripe test Checkout' })).toBeVisible();
  const stripeSessionId = new URL(page.url()).pathname.split('/').at(-1)!;
  expect(stripeSessionId).toMatch(/^cs_test_e2e_/);

  const cart = await (await request.get('/api/commerce/cart', { headers: e2eHeaders(sessionKey) })).json();
  const items = cart.items as Array<{ configuration: { unitPrice: number }; quantity: number }>;
  const subtotal = items.reduce((sum, item) => sum + item.configuration.unitPrice * item.quantity, 0);
  const quote = await (
    await request.post('/api/commerce/shipping-quote', {
      data: { items, destination: { country: 'US', state: 'IL', postalCode: '60601' } },
    })
  ).json();
  return { sessionKey, stripeSessionId, subtotal, shippingFeeCents: quote.shippingFeeCents as number, external };
}

test.describe('launch gate #10 (dry run, local only)', () => {
  test('without the e2e harness, production-shaped config refuses checkout', async ({ request }) => {
    // The local server sets COMMERCE_CHECKOUT_ENABLED=true but not
    // COMMERCE_PERSISTENCE_ENABLED, which matches production (neither is set there).
    const response = await request.post('/api/commerce/checkout', {
      data: { idempotencyKey: randomUUID() },
    });
    expect(response.status()).not.toBe(201);
    const text = await response.text();
    expect(text).not.toMatch(/checkout\.stripe\.com|cs_(test|live)_/);
  });

  test('Stripe webhook rejects missing, wrong-secret and tampered signatures', async ({ request }) => {
    const sessionKey = randomUUID();
    const { body, signature } = signedEvent('cs_test_e2e_unknown', 100);

    const missing = await request.post('/api/webhooks/stripe', {
      headers: { 'content-type': 'application/json', ...e2eHeaders(sessionKey) },
      data: body,
    });
    expect(missing.status()).toBe(400);

    const wrongSecret = new Stripe('sk_test_signature_fixture').webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_not_the_endpoint_secret' });
    const wrong = await request.post('/api/webhooks/stripe', {
      headers: { 'content-type': 'application/json', 'stripe-signature': wrongSecret, ...e2eHeaders(sessionKey) },
      data: body,
    });
    expect(wrong.status()).toBe(400);

    const tampered = await request.post('/api/webhooks/stripe', {
      headers: { 'content-type': 'application/json', 'stripe-signature': signature, ...e2eHeaders(sessionKey) },
      data: body.replace('"amount_total":100', '"amount_total":1'),
    });
    expect(tampered.status()).toBe(400);
  });

  test('paid webhook for the item subtotal creates exactly one dry-run order and no Printify writes', async ({ page, context, request }) => {
    const run = await dryRunCheckout(page, context, request);
    const { body, signature } = signedEvent(run.stripeSessionId, run.subtotal);
    const headers = { 'content-type': 'application/json', 'stripe-signature': signature, ...e2eHeaders(run.sessionKey) };

    const first = await request.post('/api/webhooks/stripe', { headers, data: body });
    expect(await first.json()).toMatchObject({ received: true, duplicate: false, fulfillment: 'dry_run_complete' });
    const retry = await request.post('/api/webhooks/stripe', { headers, data: body });
    expect(await retry.json()).toMatchObject({ received: true, duplicate: true });

    const status = await (
      await request.get(`/api/commerce/e2e/status?session_id=${encodeURIComponent(run.stripeSessionId)}`, { headers: e2eHeaders(run.sessionKey) })
    ).json();
    expect(status).toMatchObject({ paymentStatus: 'paid', dryRunCount: 1, printifyWriteCount: 0, eventAttempts: 1 });
    expect(run.external, 'browser must not reach Stripe or Printify APIs').toEqual([]);
  });

  test('BLOCKER: a payment that includes the quoted shipping is accepted as paid', async ({ page, context, request }) => {
    // Expected to fail today. Checkout adds a shipping rate (stripe-gateway.ts)
    // and automatic tax, but the pending order total is the item subtotal
    // (create_pending order in migrations/005, shipping = 0, tax = 0) and
    // complete_stripe_checkout_payment rejects any paid amount != total.
    // The e2e harness mirrors that rule. When this starts passing, remove test.fail.
    test.fail(true, 'Order total excludes shipping/tax; real Stripe amount_total will not match. See LAUNCH_GATE_10_EVIDENCE.md, blocker B1.');
    const run = await dryRunCheckout(page, context, request);
    expect(run.shippingFeeCents).toBeGreaterThan(0);
    const { body, signature } = signedEvent(run.stripeSessionId, run.subtotal + run.shippingFeeCents);
    const response = await request.post('/api/webhooks/stripe', {
      headers: { 'content-type': 'application/json', 'stripe-signature': signature, ...e2eHeaders(run.sessionKey) },
      data: body,
    });
    expect(response.ok()).toBe(true);
    const status = await (
      await request.get(`/api/commerce/e2e/status?session_id=${encodeURIComponent(run.stripeSessionId)}`, { headers: e2eHeaders(run.sessionKey) })
    ).json();
    expect(status.paymentStatus).toBe('paid');
  });
});
