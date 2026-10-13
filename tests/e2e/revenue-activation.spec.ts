import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type BrowserContext } from '@playwright/test';
import Stripe from 'stripe';

const secret = 'printme-local-e2e-secret';
const photo = readFileSync('public/landing/transformations/pet-original.webp');
const generated = readFileSync('public/designs/seasonal-edit/haunted-household.png');

async function session(context: BrowserContext) {
  const key = randomUUID();
  await context.addCookies([
    { name: 'printme-e2e-secret', value: secret, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Strict' },
    { name: 'printme-e2e-session', value: key, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Strict' },
  ]);
  return key;
}

test('family fields visibly change the preview and cart production artwork matches the personalized PNG', async ({ page, context }) => {
  await session(context);
  let printBytes: Buffer | undefined;
  await page.route('**/api/commerce/artwork/persist', async route => {
    const req = route.request();
    const form = await new Request(req.url(), { method: 'POST', headers: { 'content-type': req.headers()['content-type'] }, body: new Uint8Array(req.postDataBuffer()!) }).formData();
    printBytes = Buffer.from(await (form.get('file') as File).arrayBuffer());
    await route.continue();
  });
  await page.route('https://storage.printme.ai/**', route => route.fulfill({ contentType: 'image/png', body: printBytes ?? generated }));
  await page.goto('/halloween');
  await page.getByTestId('make-it-mine-haunted-household').click();
  const preview = page.getByTestId('personalization-preview');
  const image = preview.getByAltText('Your personalized artwork');
  await expect(image).toBeVisible();
  const before = await preview.screenshot();
  await page.getByLabel('Family / Household Name', { exact: true }).fill('THE RIVERA COVEN');
  await expect(image).toHaveAttribute('src', /THE%20RIVERA%20COVEN/);
  await expect.poll(async () => image.evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
  const after = await preview.screenshot();
  expect(after.equals(before)).toBe(false);
  const canonicalPng = await image.evaluate(async element => {
    const img = element as HTMLImageElement;
    const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const persisted = page.waitForResponse('**/api/commerce/artwork/persist');
  await page.getByRole('button', { name: /Add Custom Design to Bag/ }).click();
  const saved = await (await persisted).json();
  await expect(page.getByText('Added to your shopping bag!')).toBeVisible();
  expect(printBytes?.equals(Buffer.from(canonicalPng, 'base64'))).toBe(true);
  expect(saved.checksum).toBe(createHash('sha256').update(printBytes!).digest('hex'));
  await page.getByRole('link', { name: /View Bag/ }).click();
  await page.getByTestId('open-cart').click();
  await expect(page.getByTestId('cart-item')).toContainText('THE RIVERA COVEN');
  await expect(page.getByTestId('same-design-sets')).toBeVisible();
});

test('Halloween photo input reaches editing, persisted output previews, and a full-price matching set completes dry-run checkout', async ({ page, context, request }) => {
  const key = await session(context);
  await page.route('https://storage.printme.ai/**', route => route.fulfill({ contentType: 'image/png', body: generated }));
  await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Stripe test Checkout</h1>' }));
  await page.goto('/halloween?utm_source=instagram&utm_campaign=halloween-2026');
  await page.getByRole('link', { name: /Turn my pet into Halloween art/ }).click();
  await page.getByLabel('Upload a photo or artwork').setInputFiles({ name: 'pet.webp', mimeType: 'image/webp', buffer: photo });
  await expect(page.getByLabel('AI photo transformation')).toHaveValue('halloween-pet');
  const original = await page.getByTestId('instant-preview').screenshot();
  const generation = page.waitForResponse('**/api/commerce/artwork/generate');
  await page.getByTestId('generate-ai-photo').click();
  const result = await (await generation).json();
  expect(result.e2eImageInputChecksum).toBe(createHash('sha256').update(photo).digest('hex'));
  expect(result.checksum).toBe(createHash('sha256').update(generated).digest('hex'));
  expect(result.model).toBe('e2e-fake');
  await expect(page.getByText('Prepared artwork', { exact: true })).toBeVisible();
  expect((await page.getByTestId('instant-preview').screenshot()).equals(original)).toBe(false);
  await page.getByTestId('create-add-to-cart').click();
  await expect(page.getByText(/added with your exact placement/)).toBeVisible();
  await page.getByRole('link', { name: /View cart/ }).click();
  await page.getByTestId('open-cart').click();
  await expect(page.getByTestId('same-design-sets')).toBeVisible();
  await page.getByTestId('add-set-tee-mug-poster').click();
  await expect(page.getByTestId('cart-item')).toHaveCount(3);
  const cart = await request.get('/api/commerce/cart', { headers: { 'x-commerce-e2e-secret': secret, 'x-commerce-e2e-session': key } });
  const { items } = await cart.json();
  expect(new Set(items.map((item: { configuration: { productionAssetUrl: string } }) => item.configuration.productionAssetUrl))).toEqual(new Set([result.productionAssetUrl]));
  await page.getByTestId('begin-checkout').click();
  await page.waitForURL('https://checkout.stripe.com/**');
  const stripeSessionId = new URL(page.url()).pathname.split('/').at(-1)!;
  const subtotal = items.reduce((sum: number, item: { configuration: { unitPrice: number }; quantity: number }) => sum + item.configuration.unitPrice * item.quantity, 0);
  const event = { id: `evt_revenue_${randomUUID()}`, object: 'event', type: 'checkout.session.completed', livemode: false, created: Math.floor(Date.now()/1000), data: { object: {
    id: stripeSessionId, object: 'checkout.session', payment_status: 'paid', amount_total: subtotal, currency: 'usd', payment_intent: `pi_test_${randomUUID()}`,
    customer_details: { email: 'shopper@example.test' }, collected_information: { shipping_details: { name: 'Test Shopper', address: { line1: '1 Test Way', line2: null, city: 'Chicago', state: 'IL', postal_code: '60601', country: 'US' } } },
  } } };
  const body = JSON.stringify(event);
  const signature = new Stripe('sk_test_fixture').webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_local_e2e_only' });
  const webhook = await request.post('/api/webhooks/stripe', { headers: { 'content-type': 'application/json', 'stripe-signature': signature, 'x-commerce-e2e-secret': secret, 'x-commerce-e2e-session': key }, data: body });
  expect(await webhook.json()).toMatchObject({ received: true, fulfillment: 'dry_run_complete' });
  const status = await request.get(`/api/commerce/e2e/status?session_id=${stripeSessionId}`, { headers: { 'x-commerce-e2e-secret': secret, 'x-commerce-e2e-session': key } });
  expect(await status.json()).toMatchObject({ cartItemCount: 3, paymentStatus: 'paid', dryRunCount: 1, printifyWriteCount: 0 });
  await page.goto('/halloween');
  const viewport = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
});

test('a failed artwork save blocks cart entry and shows a recoverable error', async ({ page, context }) => {
  await session(context);
  await page.goto('/create');
  await page.getByLabel('Upload a photo or artwork').setInputFiles({ name: 'pet.webp', mimeType: 'image/webp', buffer: photo });
  await page.route('**/api/commerce/artwork/persist', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Storage unavailable' }) }));
  await page.getByTestId('create-add-to-cart').click();
  await expect(page.getByRole('alert').filter({ hasText: 'could not be saved' })).toBeVisible();
  await expect(page.getByText(/added with your exact placement/)).toHaveCount(0);
});
