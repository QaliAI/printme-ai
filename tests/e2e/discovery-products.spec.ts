import { expect, test } from '@playwright/test';

test('canonical design discovery routes use real classifications', async ({
  page,
}) => {
  await page.goto('/designs/new');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Newly published.' }),
  ).toBeVisible();
  await expect(page.locator('article')).toHaveCount(5);

  await page.goto('/designs/trending');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Trending now.' }),
  ).toBeVisible();
  await expect(page.locator('article')).toHaveCount(2);

  await page.goto('/designs/bestsellers');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bestsellers.' }),
  ).toBeVisible();
  await expect(page.getByText(/No published designs/)).toBeVisible();
});

test('approved product pages expose pricing and readiness without false promises', async ({
  page,
}) => {
  await page.goto('/products');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose the object.' }),
  ).toBeVisible();
  await expect(page.locator('section').first().getByRole('link')).toHaveCount(3);

  await page.getByRole('link', { name: /Everyday Tee/ }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Everyday Tee' }),
  ).toBeVisible();
  await expect(page.getByText(/Checkout remains blocked/)).toBeVisible();
  await expect(page.getByText('Production', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Delivery and shipping', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Returns and reprints', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create Yours' })).toHaveAttribute(
    'href',
    '/create?product=everyday-tee',
  );
});

test('shareable design URL opens the same configurator', async ({ page }) => {
  await page.goto('/designs/sunday-sidekick');
  await page.getByRole('link', { name: 'Configure this design' }).click();
  await expect(page).toHaveURL(/\/shop-v2\?design=sunday-sidekick/);
  await expect(page.getByTestId('configurator')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Sunday Sidekick' }),
  ).toBeVisible();
});
