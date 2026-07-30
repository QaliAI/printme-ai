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
  const verifyPreviewImage = async (name: string) => {
    if (process.platform === 'win32') {
      await expect(preview).toHaveScreenshot(name, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.05,
      });
      return;
    }
    const image = await preview.screenshot({ animations: 'disabled' });
    expect(image.byteLength).toBeGreaterThan(10_000);
  };
  await expect(preview).toHaveAttribute('data-product-id', 'gallery-poster');
  await verifyPreviewImage('gallery-poster-preview.png');

  await page.getByRole('button', { name: /Product Gallery Poster/ }).click();
  await page.getByRole('button', { name: /Everyday Tee/ }).click();
  await expect(preview).toHaveAttribute('data-product-id', 'everyday-tee');
  await verifyPreviewImage('everyday-tee-preview.png');

  await page.getByRole('button', { name: /Preview view Front/ }).click();
  await page.getByRole('button', { name: /Back back print area/ }).click();
  await expect(preview).toHaveAttribute('data-render-key', /tee-m-back/);
  await verifyPreviewImage('everyday-tee-back-preview.png');

  await page.getByRole('button', { name: /Product Everyday Tee/ }).click();
  await page.getByRole('button', { name: /Keepsake Mug/ }).click();
  await expect(preview).toHaveAttribute('data-product-id', 'keepsake-mug');
  await verifyPreviewImage('keepsake-mug-preview.png');
});
