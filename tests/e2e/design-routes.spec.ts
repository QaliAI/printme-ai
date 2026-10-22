import { expect, test } from '@playwright/test';

test('server-rendered design, collection, and drop routes use published seed data', async ({
  page,
}) => {
  await page.goto('/designs');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose the art first.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Civilized Trash/ })).toBeVisible();

  await page.goto('/collections');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Collections' }),
  ).toBeVisible();

  await page.goto('/designs/civilized-trash');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Civilized Trash' }),
  ).toBeVisible();

  await page.goto('/collections/specimen-plates');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Specimen Plates' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Carved Under Protest/ })).toBeVisible();

  await page.goto('/drops/specimen-plates');
  await expect(
    page.getByRole('heading', { level: 1, name: /Specimen Plates/ }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Professional Rummager/ })).toBeVisible();

  // Archived development seeds are not sold.
  expect((await page.goto('/designs/sunday-sidekick'))?.status()).toBe(404);
});

test('Shop V2 configurator traps focus and restores it on close', async ({
  page,
}) => {
  await page.goto('/shop-v2');
  const trigger = page.getByTestId('open-design-design-autumn-state-of-mind');
  await trigger.focus();
  await trigger.press('Enter');

  await expect(page.getByRole('button', { name: 'Close configurator' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('add-to-cart')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('success redirect does not claim payment without a verified webhook', async ({
  page,
}) => {
  await page.goto('/checkout/success?session_id=cs_test_unverified');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Payment verification pending',
    }),
  ).toBeVisible();
  await expect(page.getByText(/If you already paid, do not place another order/i)).toBeVisible();
});

test('Halloween features the original Carved Under Protest on the real tee', async ({ page }) => {
  await page.goto('/halloween');
  const featured = page.getByTestId('halloween-featured-original');
  await expect(featured.getByRole('heading', { name: 'Carved Under Protest' })).toBeVisible();
  await expect(featured.getByTestId('instant-preview')).toHaveAttribute('data-product-id', 'everyday-tee');
  await expect(featured.getByRole('link', { name: 'Get the tee' })).toHaveAttribute('href', '/shop?design=carved-under-protest');
});
