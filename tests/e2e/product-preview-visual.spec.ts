import path from 'node:path';
import { expect, test } from '@playwright/test';

const uploadFixture = path.resolve(
  'public/landing/transformations/pet-original.webp',
);

test('approved product previews remain visually stable', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'One deterministic desktop baseline covers the preview fixtures.',
  );
  await page.goto('/create');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page
    .getByLabel('Upload a photo or artwork')
    .setInputFiles(uploadFixture);

  const preview = page.getByTestId('instant-preview');
  await expect(preview).toHaveAttribute('data-product-id', 'gallery-poster');
  await expect(preview).toHaveScreenshot('gallery-poster-preview.png', {
    animations: 'disabled',
  });

  await page.getByRole('button', { name: /Product Gallery Poster/ }).click();
  await page.getByRole('button', { name: /Everyday Tee/ }).click();
  await expect(preview).toHaveAttribute('data-product-id', 'everyday-tee');
  await expect(preview).toHaveScreenshot('everyday-tee-preview.png', {
    animations: 'disabled',
  });

  await page.getByRole('button', { name: /Preview view Front/ }).click();
  await page.getByRole('button', { name: /Back back print area/ }).click();
  await expect(preview).toHaveAttribute('data-render-key', /tee-m-back/);
  await expect(preview).toHaveScreenshot('everyday-tee-back-preview.png', {
    animations: 'disabled',
  });

  await page.getByRole('button', { name: /Product Everyday Tee/ }).click();
  await page.getByRole('button', { name: /Keepsake Mug/ }).click();
  await expect(preview).toHaveAttribute('data-product-id', 'keepsake-mug');
  await expect(preview).toHaveScreenshot('keepsake-mug-preview.png', {
    animations: 'disabled',
  });
});
