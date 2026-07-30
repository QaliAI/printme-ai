import { expect, test } from '@playwright/test';

test('server-rendered design, collection, and drop routes use published seed data', async ({
  page,
}) => {
  await page.goto('/designs');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose the art first.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Sunday Sidekick/ })).toBeVisible();

  await page.goto('/designs/sunday-sidekick');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sunday Sidekick' }),
  ).toBeVisible();

  await page.goto('/collections/pets');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Pets' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Quiet Company/ })).toBeVisible();

  await page.goto('/drops/studio-seeds');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Studio Seeds' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Coastal Air/ })).toBeVisible();
});

test('Shop V2 configurator traps focus and restores it on close', async ({
  page,
}) => {
  await page.goto('/shop-v2');
  const trigger = page.getByTestId('open-design-design-pet-pop');
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
  await expect(page.getByText(/does not prove payment/i)).toBeVisible();
});
