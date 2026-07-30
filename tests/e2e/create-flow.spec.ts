import path from 'node:path';
import { expect, test } from '@playwright/test';

const uploadFixture = path.resolve(
  'public/landing/transformations/pet-original.webp',
);

test('guest upload, preparation, customization, and cart survive refresh', async ({
  page,
}) => {
  await page.goto('/create');
  await page.evaluate(async () => {
    window.localStorage.clear();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('printme-create');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
  await page.reload();

  await page
    .getByLabel('Upload a photo or artwork')
    .setInputFiles(uploadFixture);
  await expect(page.getByTestId('create-preview-stage')).toBeVisible();
  await expect(page.getByTestId('print-quality-status')).toContainText(
    /Good to print|May appear soft/,
  );

  await page.getByTestId('prepare-art').click();
  await expect(page.getByText('Prepared artwork')).toBeVisible();

  await page.getByRole('button', { name: /Product Gallery Poster/ }).click();
  await page.getByRole('button', { name: /Everyday Tee/ }).click();
  await expect(page.getByTestId('instant-preview')).toHaveAttribute(
    'data-product-id',
    'everyday-tee',
  );

  await page
    .getByRole('button', { name: /Color and size/ })
    .click();
  await page.getByRole('button', { name: /White \/ L/ }).click();

  const gestureLayer = page.getByTestId('artwork-gesture-layer');
  await gestureLayer.focus();
  await gestureLayer.press('ArrowRight');
  const renderKey = await page
    .getByTestId('instant-preview')
    .getAttribute('data-render-key');

  await page.reload();
  await expect(page.getByText('Prepared artwork')).toBeVisible();
  await expect(page.getByTestId('instant-preview')).toHaveAttribute(
    'data-render-key',
    renderKey ?? '',
  );
  await expect(
    page.getByRole('button', { name: /Color and size White \/ L/ }),
  ).toBeVisible();

  await page.getByTestId('create-add-to-cart').click();
  await expect(page.getByText(/added with your exact placement/i)).toBeVisible();
  await page.getByRole('link', { name: /View cart/ }).click();
  await page.getByTestId('open-cart').click();

  const item = page.getByTestId('cart-item');
  await expect(item).toContainText('Your design');
  await expect(item).toContainText('Everyday Tee');
  await expect(item.getByTestId('instant-preview')).toBeVisible();

  await page.reload();
  await page.getByTestId('open-cart').click();
  await expect(page.getByTestId('cart-item')).toContainText('Your design');
  await expect(
    page.getByTestId('cart-item').getByTestId('instant-preview'),
  ).toBeVisible();
});

test('mobile create keeps primary controls usable at 375 pixels', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile-chromium',
    'Mobile geometry is covered by the 375 pixel project.',
  );
  await page.goto('/create');
  await page
    .getByLabel('Upload a photo or artwork')
    .setInputFiles(uploadFixture);

  await expect(page.getByTestId('create-preview-stage')).toBeVisible();
  await expect(page.getByTestId('create-add-to-cart')).toBeVisible();
  await expect(page.getByTestId('artwork-gesture-layer')).toHaveCSS(
    'touch-action',
    'none',
  );

  const viewport = page.viewportSize();
  const addToCart = await page
    .getByTestId('create-add-to-cart')
    .boundingBox();
  expect(viewport?.width).toBe(375);
  expect(addToCart?.height).toBeGreaterThanOrEqual(44);
  expect((addToCart?.x ?? 0) + (addToCart?.width ?? 0)).toBeLessThanOrEqual(
    viewport?.width ?? 0,
  );
});
