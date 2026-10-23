import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// Production inspection only. Never sign in, upload photos, save designs,
// submit carts, invoke AI generation, send email, or create orders.
test.skip(process.env.PLAYWRIGHT_PRODUCTION_READONLY !== 'true',
  'Read-only production QA requires the explicit flag and a production URL');

const paths = [
  '/', '/shop', '/shop-v2', '/create', '/products', '/products/everyday-tee',
  '/products/keepsake-mug', '/products/gallery-poster',
  '/collections', '/collections/halloween', '/collections/fall',
  '/collections/thanksgiving', '/designs', '/designs/bestsellers',
  '/designs/new', '/designs/trending', '/halloween', '/drops',
  '/pets', '/pets/create', '/pets/keepsakes', '/pets/gift', '/pets/privacy',
  '/auth/signin', '/auth/signup', '/cart', '/checkout/cancel',
  '/studio', '/studio/collections', '/studio/products',
];

for (const route of paths) {
  test('production read-only audit: ' + route, async ({ page }, info) => {
    test.setTimeout(90_000);
    const routeId = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
    const out = path.resolve('output/playwright/live-readonly', info.project.name);
    await fs.mkdir(out, { recursive: true });
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message.slice(0, 280)));
    page.on('requestfailed', request => {
      const url = request.url();
      if (url.startsWith(page.url().split('/').slice(0, 3).join('/')))
        failedRequests.push(url.split('?')[0].slice(0, 240));
    });
    let status: number | null = null;
    let navigationError = '';
    try {
      const response = await page.goto(route, {
        waitUntil: 'domcontentloaded', timeout: 25_000,
      });
      status = response?.status() ?? null;
      await page.waitForTimeout(650);
    } catch (error) {
      navigationError = String(error).slice(0, 500);
    }
    const data = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const viewport = document.documentElement.clientWidth;
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
        h1: Array.from(document.querySelectorAll('h1')).map(x => x.textContent?.trim().slice(0, 150)),
        viewport,
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - viewport),
        imageCount: imgs.length,
        brokenLoadedImages: imgs.filter(img => img.complete && img.naturalWidth === 0)
          .map(img => img.currentSrc || img.src).slice(0, 15),
        ariaUnlabeledButtons: Array.from(document.querySelectorAll('button'))
          .filter(button => !button.textContent?.trim() && !button.getAttribute('aria-label') && !button.getAttribute('title'))
          .length,
      };
    }).catch(() => null);
    let screenshotError = '';
    try {
      await page.screenshot({
        path: path.join(out, routeId + '.png'),
        fullPage: true,
        animations: 'disabled',
        timeout: 18_000,
      });
    } catch (error) {
      screenshotError = String(error).slice(0, 300);
    }
    const finding = { route, project: info.project.name, status, navigationError,
      screenshotError, pageErrors, failedRequests: failedRequests.slice(0, 20), ...data };
    await fs.writeFile(path.join(out, routeId + '.json'),
      JSON.stringify(finding, null, 2));
    console.log('PRODUCTION_VISUAL_QA ' + JSON.stringify(finding));
    expect(navigationError, 'Failed to navigate to ' + route).toBe('');
    expect(status, 'Unexpected HTTP status for ' + route).not.toBeNull();
    expect(status!, 'Unexpected HTTP status for ' + route).toBeLessThan(400);
  });
}
