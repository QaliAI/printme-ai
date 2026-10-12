import { expect, test } from '@playwright/test';
import path from 'node:path';

const heroCta = /^Make something$/i;

test('Act I shows the promise, both CTAs and real product previews without waiting', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Your brain\. Our print shop\./i })).toBeVisible();
  const make = page.getByTestId('hero-make');
  const shop = page.getByRole('link', { name: /Shop the chaos/i });
  await expect(make).toBeVisible();
  await expect(shop).toBeVisible();
  await expect(page.getByText(/Custom items from \$19/)).toBeVisible();

  const viewport = page.viewportSize()!;
  if (testInfo.project.name !== 'mobile-chromium') {
    const box = await shop.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  }
  await expect(page.getByTestId('hero-feature').getByTestId('instant-preview')).toHaveAttribute('data-product-id', 'everyday-tee');
});

test('Wall of drops lists published designs with catalog prices and no invented popularity labels', async ({ page }) => {
  await page.goto('/');
  const wall = page.getByTestId('homepage-product-showcase');
  await expect(wall).toContainText('Make Shit. Print Shit.');
  await expect(wall).toContainText('Bad Ideas Club');
  await expect(wall).toContainText('Creature of Habit');
  await expect(wall).toContainText('Everyday Tee · $34');
  await expect(wall).not.toContainText(/best ?seller|trending|top rated/i);
});

test('The Rebel Bot wall sequence ends on a shoppable real tee preview', async ({ page }) => {
  await page.goto('/');
  const sequence = page.getByTestId('rebel-wall-sequence');
  const { top, travel } = await sequence.evaluate((el) => ({
    top: el.getBoundingClientRect().top + window.scrollY,
    travel: (el as HTMLElement).offsetHeight - window.innerHeight,
  }));
  await page.evaluate((y) => window.scrollTo(0, y), top + travel);
  await expect(sequence.getByRole('link', { name: 'Shop this design' })).toBeVisible();
  await expect(sequence).toContainText('Creature of Habit');
  await expect(sequence).toContainText('$34');
  await expect(sequence.getByTestId('instant-preview')).toHaveAttribute('data-product-id', 'everyday-tee');
});

test('Reduced motion shows the finished wall composition without pinning', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const sequence = page.getByTestId('rebel-wall-sequence');
  await sequence.evaluate((el) => el.scrollIntoView());
  await expect(sequence.getByRole('link', { name: 'Shop this design' })).toBeVisible();
  const height = await sequence.evaluate((el) => (el as HTMLElement).offsetHeight);
  expect(height).toBeLessThan(2 * (page.viewportSize()?.height ?? 900));
  await context.close();
});

test('Act III previews an uploaded photo on a real product and hands it to the studio', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('#homepage-photo')
    .setInputFiles(path.join(process.cwd(), 'public', 'designs', 'issue-01', 'bad-ideas-club.webp'));
  const preview = page.getByTestId('try-it-preview');
  await expect(preview.locator('img[src^="blob:"]')).toHaveCount(1);
  await expect(page.getByText(/Your photo · stays on this device/i)).toBeVisible();
  await page.getByTestId('continue-to-studio').click();
  // first client navigation compiles /create on the dev server
  await expect(page).toHaveURL(/\/create\?product=everyday-tee&artwork=blob/, { timeout: 30_000 });
  await expect(page.getByTestId('instant-preview').locator('img[src^="blob:"]').first()).toBeVisible({ timeout: 15_000 });
});

test('Trend radar cites its sources and does not claim sales rankings', async ({ page }) => {
  await page.goto('/');
  const radar = page.getByRole('region', { name: /What the internet/i });
  await expect(radar).toContainText(/not our sales numbers and not a live ranking/i);
  const sources = radar.locator('a[target="_blank"]');
  expect(await sources.count()).toBeGreaterThan(0);
});

test('Mobile keeps commerce controls reachable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile geometry is validated once.');
  await page.goto('/');
  const primary = page.getByTestId('hero-make');
  const stickyBar = page.getByTestId('home-mobile-commerce-bar');
  await expect(primary).toBeVisible();
  await expect(stickyBar).toBeVisible();
  const primaryBox = await primary.boundingBox();
  const stickyBox = await stickyBar.getByRole('link', { name: heroCta }).boundingBox();
  expect(primaryBox?.height).toBeGreaterThanOrEqual(44);
  expect(stickyBox?.height).toBeGreaterThanOrEqual(44);
  expect(primaryBox!.y).toBeLessThan(844);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
