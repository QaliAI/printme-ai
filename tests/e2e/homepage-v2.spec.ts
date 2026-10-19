import { expect, test } from '@playwright/test';
import path from 'node:path';

const e2eCookie = { name: 'printme-e2e-secret', value: 'printme-local-e2e-secret', domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Strict' as const };

test('hero plays the mascot video with both CTAs above the fold and a pause control', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Make shit\. Print shit\./i })).toBeVisible();
  const upload = page.getByTestId('hero-make');
  const shop = page.getByRole('link', { name: /^Shop the drop$/i }).first();
  await expect(upload).toHaveText(/Upload your photo/i);
  await expect(shop).toHaveAttribute('href', '#drop');
  if (testInfo.project.name !== 'mobile-chromium') {
    const box = await shop.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  const video = page.getByTestId('hero-video');
  const expected = testInfo.project.name === 'mobile-chromium' ? /hero-canvas-portrait\.mp4$/ : /hero-canvas\.mp4$/;
  await expect(video).toHaveAttribute('src', expected);
  const toggle = page.getByRole('button', { name: /background video/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
});

test('the page scrolls naturally and shows no retired designs or unsupported claims', async ({ page }) => {
  await page.goto('/');
  const sticky = await page.evaluate(
    () => [...document.querySelectorAll('main *')].filter((el) => getComputedStyle(el).position === 'sticky').length,
  );
  expect(sticky).toBe(0);
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/Bad Ideas Club|Creature of Habit|Library of Lost Hours/i);
  expect(text).not.toMatch(/best ?seller|trending now|heavyweight|heavy ink/i);
  await expect(page.getByTestId('homepage-product-showcase')).toContainText(/lightweight 4.2 oz/i);
});

test('the drop shows ten different official mockups, each opening a purchasable design', async ({ page }) => {
  await page.goto('/');
  const drop = page.getByTestId('homepage-drop');
  const cards = drop.getByTestId('drop-card');
  await expect(cards).toHaveCount(10);
  const sources = await drop.locator('img[alt]:not([alt=""])').evaluateAll((images) => images.map((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src));
  // Every card uses a different official mockup image.
  expect(new Set(sources).size).toBe(sources.length);
  expect(sources.every((src) => decodeURIComponent(src).includes('/merch/'))).toBe(true);
  await cards.filter({ hasText: 'Second Helping Athletics' }).click();
  await expect(page).toHaveURL(/\/designs\/second-helping-athletics$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1, name: /Second Helping Athletics/i })).toBeVisible();
  await expect(page.getByTestId('instant-preview').first()).toHaveAttribute('data-product-id', 'cozy-crewneck');
});

test('the spray scene scrubs with scroll and loads its clip lazily', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'Scrub geometry is validated on wider viewports.');
  await page.goto('/');
  const scrub = page.getByTestId('spray-scrub');
  const clip = scrub.locator('video');
  await expect(clip).not.toHaveAttribute('src', /.+/);
  await scrub.scrollIntoViewIfNeeded();
  await expect(clip).toHaveAttribute('src', /spray-scrub\.mp4$/);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => scrub.locator('li[data-shown="true"]').count(), { timeout: 10_000 }).toBeGreaterThan(0);
});

test('upload → remove background → preview cutout → choose product → continue to studio', async ({ page, context }) => {
  await context.addCookies([e2eCookie]);
  await page.goto('/');
  await page.locator('#homepage-photo').setInputFiles(path.join(process.cwd(), 'public', 'samples', 'ginger-cat.jpg'));
  await page.getByTestId('remove-background').click();
  await expect(page.getByTestId('refine-cutout')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('cutout-preview').locator('img')).toHaveAttribute('alt', 'Your cutout');
  await page.getByTestId('refine-cutout').click();
  await expect(page.getByTestId('cutout-canvas')).toBeVisible();
  await page.getByTestId('refine-cutout').click();
  await page.getByTestId('try-it').getByRole('button', { name: 'Mug' }).click();
  await expect(page.getByTestId('try-it-preview').getByTestId('instant-preview')).toHaveAttribute('data-product-id', 'keepsake-mug');
  await page.getByTestId('try-it').getByRole('button', { name: 'Tee' }).click();
  await page.getByTestId('continue-to-studio').click();
  // first client navigation compiles /create on the dev server
  await expect(page).toHaveURL(/\/create\?product=everyday-tee&artwork=blob/, { timeout: 30_000 });
  await expect(page.getByTestId('instant-preview').locator('img[src^="blob:"]').first()).toBeVisible({ timeout: 15_000 });
});

test('a cutout becomes a personalized specimen plate at print size and continues to the studio', async ({ page, context }) => {
  await context.addCookies([e2eCookie]);
  await page.goto('/');
  await page.getByTestId('use-sample').click();
  await page.getByTestId('remove-background').click();
  await expect(page.getByTestId('refine-cutout')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('mode-plate').click();
  const form = page.getByTestId('plate-form');
  await form.getByLabel('Pet name').fill('Maple');
  await form.getByLabel('Species').selectOption('cat');
  await form.getByLabel('Title').selectOption('professional napper');
  const plate = page.getByTestId('cutout-preview').locator('img[alt="Your specimen plate"]');
  await expect(plate).toBeVisible({ timeout: 20_000 });
  const size = await plate.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(size).toEqual([3951, 4800]);
  await expect(page.getByTestId('try-it-preview').getByTestId('instant-preview')).toHaveAttribute('data-product-id', 'everyday-tee');
  await page.getByTestId('continue-to-studio').click();
  await expect(page).toHaveURL(/\/create\?product=everyday-tee&artwork=blob/, { timeout: 30_000 });
});

test('the sample photo works without an upload', async ({ page, context }) => {
  await context.addCookies([e2eCookie]);
  await page.goto('/');
  await page.getByTestId('use-sample').click();
  await expect(page.getByTestId('remove-background')).toBeVisible();
});

test('mobile keeps commerce controls reachable without horizontal scroll', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile geometry is validated once.');
  await page.goto('/');
  const primary = page.getByTestId('hero-make');
  const stickyBar = page.getByTestId('home-mobile-commerce-bar');
  await expect(primary).toBeVisible();
  await expect(stickyBar).toBeVisible();
  const primaryBox = await primary.boundingBox();
  const stickyBox = await stickyBar.getByRole('link', { name: /Upload photo/i }).boundingBox();
  expect(primaryBox?.height).toBeGreaterThanOrEqual(44);
  expect(stickyBox?.height).toBeGreaterThanOrEqual(44);
  expect(primaryBox!.y).toBeLessThan(844);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
