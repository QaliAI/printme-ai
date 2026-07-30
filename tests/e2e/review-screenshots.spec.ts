import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const uploadFixture = path.resolve(
  'public/landing/transformations/pet-original.webp',
);
const screenshotRoot = path.resolve(
  'output/playwright/review-screenshots',
);
const viewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`Sprint 3 review captures at ${viewport.width}x${viewport.height}`, async ({
    context,
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'The screenshot test sets all four explicit review viewports.',
    );
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const directory = path.join(
      screenshotRoot,
      `${viewport.width}x${viewport.height}`,
    );
    mkdirSync(directory, { recursive: true });
    const capture = (name: string) =>
      page.screenshot({
        path: path.join(directory, `${name}.png`),
        animations: 'disabled',
      });
    const setCreateScale = async (value: string) => {
      if (viewport.width <= 700) {
        await page.getByRole('button', { name: /^Placement/ }).click();
        await page.locator('#sheet-scale').fill(value);
        await page.keyboard.press('Escape');
        return;
      }
      await page.getByLabel('Scale', { exact: true }).fill(value);
    };
    await context.addCookies([
      {
        name: 'printme-e2e-secret',
        value: 'printme-local-e2e-secret',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Strict',
      },
      {
        name: 'printme-e2e-session',
        value: randomUUID(),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);

    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toBeVisible();
    await capture('01-homepage-v2');

    await page.goto('/create');
    await expect(page.getByTestId('create-drop-zone')).toBeVisible();
    await capture('02-mobile-upload');
    await page
      .getByLabel('Upload a photo or artwork')
      .setInputFiles(uploadFixture);
    await expect(page.getByTestId('create-preview-stage')).toBeVisible();
    await capture('04-mobile-product-customization');

    await page.getByTestId('prepare-background-removed').click();
    await expect(page.getByText('Prepared artwork')).toBeVisible();
    await capture('03-background-preparation');

    await setCreateScale('1.25');
    const gestureLayer = page.getByTestId('artwork-gesture-layer');
    await gestureLayer.focus();
    await gestureLayer.press('ArrowRight');
    await capture('05-drag-and-scale');

    await page.getByRole('button', { name: /Product Gallery Poster/ }).click();
    await page.getByRole('button', { name: /Everyday Tee/ }).click();
    await expect(page.getByTestId('instant-preview')).toHaveAttribute(
      'data-product-id',
      'everyday-tee',
    );
    await capture('06-product-switching');

    await setCreateScale('2.4');
    await expect(page.getByTestId('print-quality-status')).not.toContainText(
      'Good to print',
    );
    await capture('07-quality-warning');
    await setCreateScale('0.8');

    await page.getByTestId('create-add-to-cart').click();
    await page.getByRole('link', { name: /View cart/ }).click();
    await page.getByTestId('open-cart').click();
    await expect(page.getByTestId('cart-item')).toBeVisible();
    await capture('08-cart');
    await expect(page.getByTestId('same-design-upsells')).toBeVisible();
    await capture('09-same-design-upsell');

    await page.goto('/designs/new');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Newly published.',
      }),
    ).toBeVisible();
    await capture('10-design-gallery');

    await page.goto('/products/gallery-poster');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Gallery Poster' }),
    ).toBeVisible();
    await capture('11-product-page');

    await context.addCookies([
      {
        name: 'printme-studio-e2e-secret',
        value: 'printme-local-studio-e2e-secret',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    await page.goto('/studio/designs/new');
    await page
      .getByLabel('Upload curated design')
      .setInputFiles(uploadFixture);
    await expect(page.getByText(/pet-original\.webp/i)).toBeVisible();
    await capture('12-studio-upload');

    await page
      .getByRole('heading', { name: '4. Product compatibility' })
      .scrollIntoViewIfNeeded();
    await capture('13-studio-compatibility-matrix');

    const suffix = String(viewport.width);
    const fields = {
      Title: `Studio Review ${suffix}`,
      'Artist or source': 'PrintMe QA',
      'Usage rights': 'Internal review license',
      'Alt text': 'Bright studio review portrait artwork',
      'Tags, comma separated': 'review, studio',
      'SEO title': `Studio Review ${suffix}`,
      'SEO description':
        'A complete preview prepared by the secure local Studio review flow.',
      Description:
        'A complete curated design used to verify the Studio publishing workflow.',
      'Rights documentation notes':
        'Internal fixture approved for automated local review only.',
    };
    for (const [label, value] of Object.entries(fields)) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await page
      .getByRole('heading', { name: 'Prepublication checklist' })
      .scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled();
    await capture('14-studio-publish-preview');
  });
}
