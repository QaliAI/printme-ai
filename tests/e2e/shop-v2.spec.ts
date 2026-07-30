import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { expect, test } from '@playwright/test';

const e2eSecret = 'printme-local-e2e-secret';
const webhookSecret = 'whsec_local_e2e_only';

test('shopper completes persistent test checkout through verified dry-run fulfillment', async ({
  context,
  page,
  request,
}) => {
  const sessionKey = randomUUID();
  await context.addCookies([
    {
      name: 'printme-e2e-secret',
      value: e2eSecret,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
    {
      name: 'printme-e2e-session',
      value: sessionKey,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.route('https://checkout.stripe.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<main><h1>Stripe test Checkout</h1><p>No charge was made.</p></main>',
    });
  });

  await page.goto('/shop-v2');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Art worth living with.' }),
  ).toBeVisible();
  await page.getByTestId('open-design-design-pet-pop').click();

  const preview = page.getByTestId('instant-preview');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute(
    'data-product-id',
    'gallery-poster',
  );
  const posterRenderKey = await preview.getAttribute('data-render-key');

  await page.getByTestId('product-switch-everyday-tee').click();
  await expect(preview).toHaveAttribute(
    'data-product-id',
    'everyday-tee',
  );
  const teeRenderKey = await preview.getAttribute('data-render-key');
  expect(teeRenderKey).not.toBe(posterRenderKey);
  await page.getByRole('button', { name: 'White / L' }).click();
  await expect(page.getByText(/front.*dtg/i)).toBeVisible();

  await page.getByTestId('add-to-cart').click();
  const drawer = page.getByTestId('cart-drawer');
  await expect(drawer).toBeVisible();
  let item = page.getByTestId('cart-item');
  await expect(item).toHaveAttribute('data-render-key', teeRenderKey ?? '');
  await expect(item).toContainText('Sunday Sidekick');
  await expect(item).toContainText('Everyday Tee');
  await expect(item).toContainText('White');
  await expect(item).toContainText('L');
  await expect(item).toContainText('scale 0.82');
  await expect(item).toContainText('$34.00');

  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('open-cart').click();
  item = page.getByTestId('cart-item');
  await expect(item).toContainText('Sunday Sidekick');
  await expect(item).toContainText('L');

  await page.getByTestId('begin-checkout').click();
  await expect(
    page.getByRole('heading', { name: 'Stripe test Checkout' }),
  ).toBeVisible();
  const stripeSessionId = new URL(page.url()).pathname.split('/').at(-1);
  expect(stripeSessionId).toMatch(/^cs_test_e2e_/);

  const event = {
    id: `evt_e2e_${randomUUID()}`,
    object: 'event',
    api_version: '2026-04-22.dahlia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: stripeSessionId,
        object: 'checkout.session',
        payment_status: 'paid',
        amount_total: 3400,
        currency: 'usd',
        payment_intent: `pi_test_e2e_${randomUUID()}`,
        customer_details: {
          email: 'shopper@example.test',
        },
        collected_information: {
          shipping_details: {
            name: 'Test Shopper',
            address: {
              line1: '1 Test Way',
              line2: null,
              city: 'Chicago',
              state: 'IL',
              postal_code: '60601',
              country: 'US',
            },
          },
        },
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: 'checkout.session.completed',
  };
  const body = JSON.stringify(event);
  const signature = new Stripe('sk_test_signature_fixture')
    .webhooks.generateTestHeaderString({
      payload: body,
      secret: webhookSecret,
    });
  const webhookHeaders = {
    'content-type': 'application/json',
    'stripe-signature': signature,
    'x-commerce-e2e-secret': e2eSecret,
    'x-commerce-e2e-session': sessionKey,
  };
  const verified = await request.post(
    'http://localhost:3000/api/webhooks/stripe',
    { headers: webhookHeaders, data: body },
  );
  expect(verified.ok()).toBe(true);
  expect(await verified.json()).toMatchObject({
    received: true,
    duplicate: false,
    fulfillment: 'dry_run_complete',
  });

  const duplicate = await request.post(
    'http://localhost:3000/api/webhooks/stripe',
    { headers: webhookHeaders, data: body },
  );
  expect(await duplicate.json()).toMatchObject({
    received: true,
    duplicate: true,
  });

  await page.goto(
    `/checkout/success?session_id=${encodeURIComponent(stripeSessionId!)}`,
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Payment verified' }),
  ).toBeVisible();

  const status = await request.get(
    `http://localhost:3000/api/commerce/e2e/status?session_id=${encodeURIComponent(stripeSessionId!)}`,
    {
      headers: {
        'x-commerce-e2e-secret': e2eSecret,
        'x-commerce-e2e-session': sessionKey,
      },
    },
  );
  expect(await status.json()).toMatchObject({
    cartItemCount: 1,
    paymentStatus: 'paid',
    fulfillmentState: 'dry_run_complete',
    dryRunCount: 1,
    printifyWriteCount: 0,
    eventAttempts: 1,
  });
});
