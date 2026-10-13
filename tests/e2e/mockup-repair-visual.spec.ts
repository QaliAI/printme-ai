import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, test, type Locator } from '@playwright/test';
const seasonal = [['haunted-household', 'everyday-tee', 'seasonal-haunted-household-tee'], ['library-of-lost-hours', 'keepsake-mug', 'seasonal-library-of-lost-hours-mug'], ['midnight-hayride', 'everyday-tee', 'seasonal-midnight-hayride-tee'], ['night-garden-society', 'gallery-poster', 'seasonal-night-garden-poster'], ['field-notes-after-dark', 'gallery-poster', 'seasonal-field-notes-poster'], ['leftovers-league', 'everyday-tee', 'seasonal-leftovers-league-tee']] as const;
const fall = ['boo-crew', 'here-for-the-boos', 'little-pumpkin', 'autumn-state-of-mind', 'powered-by-pumpkin-spice', 'sweater-weather', 'feast-mode', 'thankful-grateful-caffeinated', 'thanksgiving-social-club'];
const routes = ['/', '/halloween', '/shop-v2', '/create', '/designs', '/collections/halloween', '/collections/fall', '/collections/thanksgiving', '/products/everyday-tee', '/products/keepsake-mug', '/products/gallery-poster', '/products', '/collections', ...fall.map(slug => `/designs/${slug}`), ...seasonal.map(([slug]) => `/designs/${slug}`)];
async function decodeImages(locator: Locator) {
  await locator.locator('img').evaluateAll(async images => {
    await Promise.all(images.map(image => {
      if (!(image instanceof HTMLImageElement)) return;
      image.loading = 'eager';
      return image.decode().catch(() => {});
    }));
  });
}
async function checkPreview(preview: Locator, productId?: string) {
  await expect(preview).toBeVisible();
  if (productId) await expect(preview).toHaveAttribute('data-product-id', productId);
  await decodeImages(preview);
  const geometry = await preview.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {
      ratio: rect.width / rect.height,
      broken: Array.from(element.querySelectorAll('img')).some(img => !img.complete || !img.naturalWidth),
      contaminated: Array.from(element.querySelectorAll('img')).some(img => /landing\/mockups|seasonal-edit\/mockups/.test(img.src))
    };
  });
  expect(geometry.ratio).toBeCloseTo(1, 2);
  expect(geometry.broken).toBe(false);
  expect(geometry.contaminated).toBe(false);
}
test('sitewide mockup visual audit', async ({
  page,
  context
}, info) => {
  test.setTimeout(300_000);
  const phase = process.env.MOCKUP_QA_PHASE ?? 'after';
  const remote = Boolean(process.env.PLAYWRIGHT_BASE_URL);
  const directory = path.resolve('output/playwright/mockup-repair', phase, info.project.name);
  await fs.mkdir(directory, {
    recursive: true
  });
  // Remote visual QA keeps cart operations inside the browser; no live data writes.
  if (remote && phase !== 'before') {
    await page.route('**/api/commerce/cart', route => route.fulfill({
      status: 503,
      json: {
        error: 'Visual QA uses browser cart only'
      }
    }));
    await page.route('**/api/commerce/cart/items', route => route.fulfill({
      status: 503,
      json: {
        error: 'Visual QA uses browser cart only'
      }
    }));
  } else if (!remote) {
    await context.addCookies([{
      name: 'printme-e2e-secret',
      value: 'printme-local-e2e-secret',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }, {
      name: 'printme-e2e-session',
      value: randomUUID(),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict'
    }]);
  }
  const capture = async (locator: Locator, name: string, snapshot = false) => {
    await decodeImages(locator);
    await locator.screenshot({
      path: path.join(directory, `${name}.png`),
      animations: 'disabled'
    });
    if (snapshot && !remote && phase !== 'before') await expect(locator).toHaveScreenshot(`${name}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01
    });
  };
  const results: Array<{
    route: string;
    status: number | undefined;
  }> = [];
  for (const route of routes) {
    const response = await page.goto(route);
    results.push({
      route,
      status: response?.status()
    });
    if (phase !== 'before') expect(response?.status(), route).toBe(200);
    await decodeImages(page.locator('body'));
    await page.screenshot({
      path: path.join(directory, `${route === '/' ? 'homepage' : route.slice(1).replaceAll('/', '-')}.png`),
      fullPage: true,
      animations: 'disabled'
    });
    if (phase !== 'before' && route === '/') {
      // Issue Nº 01 homepage: every product preview must be a clean, uncontaminated InstantPreview render.
      await checkPreview(page.getByTestId('hero-feature').getByTestId('instant-preview'), 'everyday-tee');
      const showcase = page.getByTestId('homepage-product-showcase');
      const previews = showcase.getByTestId('instant-preview');
      expect(await previews.count()).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < (await previews.count()); i++) await checkPreview(previews.nth(i));
      await capture(showcase, 'homepage-product-showcase');
    }
    if (route === '/halloween') {
      for (const [slug, product, name] of seasonal) {
        const card = page.getByTestId(`seasonal-card-${slug}`);
        if (phase !== 'before') {
          await checkPreview(card.getByTestId('instant-preview'), product);
          await expect(card).not.toContainText(/Official preview ready|Safe print area/);
          await expect(card).toContainText(product === 'everyday-tee' ? '$34.00' : product === 'keepsake-mug' ? '$19.00' : '$29.00');
        }
        // Pixel baselines were recorded from the retired homepage cards; /halloween is captured for review only.
        if (await card.count()) await capture(card, name);
      }
      if (phase !== 'before' && route === '/halloween') {
        for (const slug of ['haunted-household', 'library-of-lost-hours', 'midnight-hayride', 'field-notes-after-dark', 'leftovers-league']) {
          await page.getByTestId(`make-it-mine-${slug}`).click();
          await checkPreview(page.getByTestId('personalization-preview').getByTestId('instant-preview'));
          await capture(page.getByTestId('personalization-preview'), `personalization-${slug}`);
          await page.getByRole('button', {
            name: /Close/
          }).click();
        }
      }
    }
    if (phase !== 'before' && route.startsWith('/products/')) await checkPreview(page.getByTestId('instant-preview'), route.split('/').at(-1));
    if (phase !== 'before') expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  if (phase !== 'before') {
    await page.goto('/create');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByLabel('Upload a photo or artwork').setInputFiles(path.resolve('public/landing/transformations/pet-original.webp'));
    const preview = page.getByTestId('instant-preview');
    await checkPreview(preview, 'gallery-poster');
    await capture(preview, 'approved-poster-preview', true);
    for (const [product, label, name] of [['everyday-tee', 'Everyday Tee', 'approved-tee-preview'], ['keepsake-mug', 'Keepsake Mug', 'approved-mug-preview']]) {
      await page.getByRole('button', {
        name: /^Product /
      }).click();
      await page.getByRole('button', {
        name: new RegExp(label)
      }).click();
      await checkPreview(preview, product);
      await capture(preview, name, true);
      await page.getByRole('button', {
        name: /^Preview view /
      }).click();
      await page.getByRole('button', {
        name: product === 'everyday-tee' ? /Back back print area/ : /Right of handle/
      }).click();
      await checkPreview(preview, product);
      await capture(preview, `${name}-reverse`);
    }
    // Real approved configurator, browser-only cart on Preview, test store locally.
    await page.goto('/shop-v2?design=haunted-household');
    const shopPreview = page.getByTestId('instant-preview');
    await checkPreview(shopPreview);
    await capture(shopPreview, 'shop-configurator');
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-item')).toHaveCount(1);
    await capture(page.getByTestId('cart-drawer'), 'cart-and-upsells');
    const upsells = page.getByTestId('same-design-upsells');
    if (!remote) await expect(upsells).toBeVisible();
    if (await upsells.count()) {
      for (const item of await upsells.getByTestId('instant-preview').all()) await checkPreview(item);
      await capture(upsells, 'cart-upsell-previews');
    } else await expect(page.getByTestId('same-design-upsells')).toHaveCount(0);
    if (remote) {
      for (const product of ['keepsake-mug', 'gallery-poster']) {
        await page.goto('/shop-v2?design=haunted-household');
        await page.getByTestId(`product-switch-${product}`).click();
        await page.getByTestId('add-to-cart').click();
      }
      await expect(page.getByTestId('cart-item')).toHaveCount(3);
      for (const product of ['everyday-tee', 'keepsake-mug', 'gallery-poster']) {
        const cartPreview = page.getByTestId('cart-item').locator(`[data-testid="instant-preview"][data-product-id="${product}"]`);
        await checkPreview(cartPreview, product);
        await capture(cartPreview, `cart-thumbnail-${product}`);
      }
      await capture(page.getByTestId('cart-drawer'), 'cart-all-approved-products');
    }
    await page.goto(`/app/create/products?design=guest-design-visual&designUrl=${encodeURIComponent('/designs/seasonal-edit/library-of-lost-hours.webp')}`);
    await expect(page.getByTestId('live-product-mockups')).toBeVisible();
    for (const product of ['everyday-tee', 'keepsake-mug', 'gallery-poster']) await checkPreview(page.getByTestId(`legacy-preview-${product}`).getByTestId('instant-preview'), product);
    await capture(page.getByTestId('live-product-mockups'), 'legacy-product-previews');
    await page.route('**/api/printify/mockups', route => route.fulfill({
      status: 503,
      json: {
        error: 'Offline Printify test'
      }
    }));
    await page.getByRole('button', {
      name: 'Request Printify previews'
    }).click();
    await expect(page.getByRole('status')).toContainText('instant previews');
    await capture(page.getByTestId('live-product-mockups'), 'printify-failure-fallback');
    await page.getByTestId('legacy-preview-keepsake-mug').click();
    await expect(page).toHaveURL(/\/create\?product=keepsake-mug&artwork=/);
    await expect(page.getByAltText('Your saved artwork')).toBeVisible();
    await checkPreview(page.getByTestId('instant-preview'), 'keepsake-mug');
    await capture(page.getByTestId('instant-preview'), 'legacy-artwork-handoff');
    await page.route('**/api/generate-design', route => route.fulfill({
      json: { id: 'guest-design-visual', design_url: '/designs/seasonal-edit/library-of-lost-hours.webp', status: 'completed' }
    }));
    await page.goto('/app/create/preview?upload=guest-upload-visual&style=visual-test&imageUrl=%2Flanding%2Ftransformations%2Fpet-original.webp');
    await expect(page.getByTestId('live-product-mockups')).toBeVisible();
    for (const product of ['everyday-tee', 'keepsake-mug', 'gallery-poster']) await checkPreview(page.getByTestId(`legacy-preview-${product}`).getByTestId('instant-preview'), product);
    await capture(page.getByTestId('live-product-mockups'), 'legacy-design-preview-products');
    await page.getByTestId('legacy-preview-keepsake-mug').click();
    await expect(page).toHaveURL(/\/create\?product=keepsake-mug&artwork=/);
    await expect(page.getByAltText('Your saved artwork')).toBeVisible();
    await checkPreview(page.getByTestId('instant-preview'), 'keepsake-mug');
    await capture(page.getByTestId('instant-preview'), 'legacy-preview-artwork-handoff');
  }
  await fs.writeFile(path.join(directory, 'routes.json'), JSON.stringify(results, null, 2));
});
