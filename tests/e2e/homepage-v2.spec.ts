import { expect, test } from '@playwright/test';
import path from 'node:path';

test('hero shows the promise, both CTAs and a real product preview without waiting', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Your brain\. Our print shop\./i })).toBeVisible();
  const upload = page.getByTestId('hero-make');
  const shop = page.getByRole('link', { name: /^Shop the drops$/i }).first();
  await expect(upload).toHaveText(/Upload your photo/i);
  await expect(upload).toHaveAttribute('href', '/create');
  await expect(shop).toBeVisible();
  if (testInfo.project.name !== 'mobile-chromium') {
    const box = await shop.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await expect(page.getByTestId('hero-feature').getByTestId('instant-preview')).toHaveAttribute('data-product-id', 'everyday-tee');
  await expect(page.getByText('Styled photo').first()).toBeVisible();
});

test('the page scrolls naturally: no pinned scroll story, products right after the hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('rebel-wall-sequence')).toHaveCount(0);
  const heroBottom = await page
    .getByRole('heading', { level: 1 })
    .evaluate((el) => el.closest('section')!.getBoundingClientRect().bottom + window.scrollY);
  const dropsTop = await page
    .getByTestId('homepage-product-showcase')
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(dropsTop - heroBottom).toBeLessThan(40);
  const sticky = await page.evaluate(
    () => [...document.querySelectorAll('main *')].filter((el) => getComputedStyle(el).position === 'sticky').length,
  );
  expect(sticky).toBe(0);
});

test('featured drops list published designs with catalog prices and no invented popularity labels', async ({ page }) => {
  await page.goto('/');
  const drops = page.getByTestId('homepage-product-showcase');
  await expect(drops).toContainText('Make Shit. Print Shit.');
  await expect(drops).toContainText('Bad Ideas Club');
  await expect(drops).toContainText('Creature of Habit');
  await expect(drops).toContainText('$34');
  await expect(drops).not.toContainText(/best ?seller|trending|top rated/i);
  expect(await drops.getByTestId('instant-preview').count()).toBeGreaterThanOrEqual(6);
});

test('remix section replaces the research clippings and links into customization', async ({ page }) => {
  await page.goto('/');
  const remix = page.getByRole('region', { name: /Steal like an artist/i });
  await expect(remix).toBeVisible();
  await expect(remix.getByRole('link', { name: /Remix it/i }).first()).toHaveAttribute('href', /\/shop\?design=/);
  await expect(page.getByText(/not our sales numbers/i)).toHaveCount(0);
});

test('reduced motion keeps everything visible', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  const encore = page.getByRole('heading', { name: /Stop scrolling/i });
  await encore.scrollIntoViewIfNeeded();
  await expect(encore).toBeVisible();
  await expect(page.getByTestId('homepage-product-showcase').getByRole('link').first()).toBeVisible();
  await context.close();
});

test('photo try-it previews an upload on a real product and hands it to the studio', async ({ page }) => {
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
