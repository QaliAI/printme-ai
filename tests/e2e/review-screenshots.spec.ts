import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const reviewDirectory = path.join(
  process.cwd(),
  'output',
  'playwright',
  'review',
);

async function capture(
  page: Page,
  filename: string,
) {
  const session = await page.context().newCDPSession(page);
  try {
    const { data } = await session.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    });
    await writeFile(
      path.join(reviewDirectory, filename),
      Buffer.from(data, 'base64'),
    );
  } finally {
    await session.detach();
  }
}

test('capture the visible commerce review surfaces', async ({
  context,
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'A single project creates deterministic review artifacts.',
  );

  await mkdir(reviewDirectory, { recursive: true });
  await context.clearCookies();
  await page.goto('/shop-v2');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Art worth living with.' }),
  ).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  await capture(page, 'shop-v2-mobile-375x812.png');

  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, 'shop-v2-desktop-1440x900.png');

  await page.goto('/designs');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose the art first.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'PrintMe.ai' })).toBeVisible();
  await capture(page, 'design-gallery-desktop-1440x900.png');

  await page.goto('/shop-v2');
  await page.getByTestId('open-design-design-pet-pop').click();
  const preview = page.getByTestId('instant-preview');
  await expect(preview).toBeVisible();
  await page.getByTestId('product-switch-everyday-tee').click();
  await expect(preview).toHaveAttribute('data-product-id', 'everyday-tee');
  const productBase = preview.locator('img').first();
  await expect(productBase).toHaveAttribute(
    'src',
    /tee-base/,
  );
  await productBase.evaluate((image) => (image as HTMLImageElement).decode());
  await capture(page, 'product-switching-desktop-1440x900.png');

  await page.getByTestId('add-to-cart').click();
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
  await capture(page, 'cart-drawer-desktop-1440x900.png');
});
