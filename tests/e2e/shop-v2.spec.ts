import { expect, test } from '@playwright/test';

test('375px shopper preserves the switched configuration in the cart drawer', async ({
  page,
}) => {
  await page.goto('/shop-v2');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Art worth living with.' })
  ).toBeVisible();
  await page.getByTestId('open-design-design-pet-pop').click();

  const preview = page.getByTestId('instant-preview');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('data-product-id', 'gallery-poster');
  const posterRenderKey = await preview.getAttribute('data-render-key');
  await expect(page.getByTestId('current-price')).toContainText('$29.00');

  await page.getByTestId('product-switch-everyday-tee').click();
  await expect(preview).toHaveAttribute('data-product-id', 'everyday-tee');
  await expect(page.getByTestId('current-price')).toContainText('$34.00');
  const teeRenderKey = await preview.getAttribute('data-render-key');
  expect(teeRenderKey).not.toBe(posterRenderKey);

  await page.getByTestId('add-to-cart').click();
  const drawer = page.getByTestId('cart-drawer');
  await expect(drawer).toBeVisible();
  const item = page.getByTestId('cart-item');
  await expect(item).toHaveAttribute('data-render-key', teeRenderKey ?? '');
  await expect(item).toContainText('Sunday Sidekick');
  await expect(item).toContainText('Everyday Tee');
  await expect(item).toContainText('White');
  await expect(item).toContainText('M');
  await expect(item).toContainText('front · dtg');
  await expect(item).toContainText('scale 0.82');
  await expect(item).toContainText('$34.00');
  await expect(item.getByRole('button', { name: 'Edit' })).toBeVisible();
  await expect(item.getByRole('button', { name: 'Remove' })).toBeVisible();
});
