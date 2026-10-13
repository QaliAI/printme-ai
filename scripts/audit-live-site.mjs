import { chromium } from 'playwright';
import fs from 'fs';

async function audit() {
  const browser = await chromium.launch({ headless: true });
  fs.mkdirSync('audit/live-investigation', { recursive: true });

  const testPages = [
    { name: 'home-desktop', url: 'https://printme.ai', viewport: { width: 1440, height: 900 } },
    { name: 'home-mobile', url: 'https://printme.ai', viewport: { width: 390, height: 844 }, isMobile: true },
    { name: 'products-desktop', url: 'https://printme.ai/products', viewport: { width: 1440, height: 900 } },
    { name: 'products-mobile', url: 'https://printme.ai/products', viewport: { width: 390, height: 844 }, isMobile: true },
    { name: 'create-desktop', url: 'https://printme.ai/create', viewport: { width: 1440, height: 900 } },
    { name: 'create-mobile', url: 'https://printme.ai/create', viewport: { width: 390, height: 844 }, isMobile: true },
    { name: 'shop-desktop', url: 'https://printme.ai/shop', viewport: { width: 1440, height: 900 } },
    { name: 'shop-v2-desktop', url: 'https://printme.ai/shop-v2', viewport: { width: 1440, height: 900 } },
    { name: 'designs-desktop', url: 'https://printme.ai/designs', viewport: { width: 1440, height: 900 } },
    { name: 'cart-desktop', url: 'https://printme.ai/cart', viewport: { width: 1440, height: 900 } },
    { name: 'pdp-mug-desktop', url: 'https://printme.ai/products/keepsake-mug', viewport: { width: 1440, height: 900 } },
    { name: 'pdp-tote-desktop', url: 'https://printme.ai/products/canvas-tote', viewport: { width: 1440, height: 900 } },
    { name: 'pdp-tee-desktop', url: 'https://printme.ai/products/apparel-tee', viewport: { width: 1440, height: 900 } },
  ];

  for (const p of testPages) {
    const context = await browser.newContext({
      viewport: p.viewport,
      isMobile: !!p.isMobile,
      userAgent: p.isMobile 
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    const consoleLogs = [];
    const failedReqs = [];
    page.on('console', m => consoleLogs.push({ type: m.type(), text: m.text() }));
    page.on('requestfailed', r => failedReqs.push({ url: r.url(), err: r.failure()?.errorText }));

    try {
      const res = await page.goto(p.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `audit/live-investigation/${p.name}.png`, fullPage: true });

      const imgStats = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.map(img => ({
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete,
          alt: img.alt,
          visible: img.offsetParent !== null
        }));
      });

      const brokenImgs = imgStats.filter(i => i.complete && i.naturalWidth === 0);
      console.log(`=== ${p.name} (${p.url}) ===`);
      console.log(`Status: ${res?.status()}`);
      console.log(`Images total: ${imgStats.length}, broken: ${brokenImgs.length}`);
      if (brokenImgs.length > 0) {
        console.log('Broken images:', JSON.stringify(brokenImgs, null, 2));
      }
      const errors = consoleLogs.filter(l => l.type === 'error');
      if (errors.length > 0) {
        console.log('Console errors:', JSON.stringify(errors, null, 2));
      }
      const realFailed = failedReqs.filter(f => !f.url.includes('_rsc='));
      if (realFailed.length > 0) {
        console.log('Failed non-rsc requests:', JSON.stringify(realFailed, null, 2));
      }
    } catch (err) {
      console.error(`Error on ${p.name}:`, err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

audit().catch(console.error);
