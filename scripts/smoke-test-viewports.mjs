import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.PREVIEW_URL || 'https://printme-1nsvyv0b9-qaliais-projects.vercel.app';
const screenshotDir = path.resolve('screenshots');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812, label: 'Mobile (375x812 - iPhone mini)' },
  { name: 'mobile-390', width: 390, height: 844, label: 'Mobile (390x844 - iPhone standard)' },
  { name: 'tablet-768', width: 768, height: 1024, label: 'Tablet (768x1024 - iPad)' },
  { name: 'desktop-1440', width: 1440, height: 900, label: 'Desktop (1440x900)' },
];

async function run() {
  console.log(`Starting Playwright smoke test against: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n======================================================`);
    console.log(`Testing Viewport: ${vp.label}`);
    console.log(`======================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.width < 600
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
      // 1. Home Page
      console.log(`1. Navigating to Home (${BASE_URL})...`);
      const homeRes = await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle', timeout: 30000 });
      console.log(`   Status: ${homeRes.status()}`);
      const homeTitle = await page.title();
      console.log(`   Page Title: ${homeTitle}`);

      const homeScreenshotPath = path.join(screenshotDir, `${vp.name}-01-home.png`);
      await page.screenshot({ path: homeScreenshotPath, fullPage: false });
      console.log(`   Screenshot: ${homeScreenshotPath}`);

      // Check Fall Banner / Collections
      const pageText = await page.textContent('body');
      const hasFallContent = /fall|spooky|autumn|thanksgiving|halloween/i.test(pageText);
      console.log(`   Fall seasonal text detected: ${hasFallContent}`);

      // 2. Catalog / Shop V2 Browsing
      console.log(`2. Navigating to Catalog (/shop-v2)...`);
      const shopRes = await page.goto(`${BASE_URL}/shop-v2`, { waitUntil: 'networkidle', timeout: 30000 });
      console.log(`   Status: ${shopRes.status()}`);
      const shopScreenshotPath = path.join(screenshotDir, `${vp.name}-02-shop.png`);
      await page.screenshot({ path: shopScreenshotPath, fullPage: false });
      console.log(`   Screenshot: ${shopScreenshotPath}`);

      const shopText = await page.textContent('body');
      const hasDesigns = /boo crew|sweater weather|feast mode|pumpkin/i.test(shopText);
      console.log(`   Seasonal designs visible in catalog: ${hasDesigns}`);

      // 3. Product / Design Page
      console.log(`3. Navigating to Design Page (/designs/boo-crew)...`);
      const designRes = await page.goto(`${BASE_URL}/designs/boo-crew`, { waitUntil: 'networkidle', timeout: 30000 });
      console.log(`   Status: ${designRes.status()}`);
      const designScreenshotPath = path.join(screenshotDir, `${vp.name}-03-design.png`);
      await page.screenshot({ path: designScreenshotPath, fullPage: false });
      console.log(`   Screenshot: ${designScreenshotPath}`);

      // 4. Products browsing (/products)
      console.log(`4. Navigating to Products (/products)...`);
      const prodRes = await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle', timeout: 30000 });
      console.log(`   Status: ${prodRes.status()}`);
      const prodScreenshotPath = path.join(screenshotDir, `${vp.name}-04-products.png`);
      await page.screenshot({ path: prodScreenshotPath, fullPage: false });
      console.log(`   Screenshot: ${prodScreenshotPath}`);

      // Check console errors
      const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('analytics'));
      console.log(`   Console errors count: ${criticalErrors.length}`);
      if (criticalErrors.length > 0) {
        console.log(`   Sample errors:`, criticalErrors.slice(0, 3));
      }

      results.push({
        viewport: vp.label,
        homeStatus: homeRes.status(),
        shopStatus: shopRes.status(),
        designStatus: designRes.status(),
        productsStatus: prodRes.status(),
        hasFallContent,
        hasDesigns,
        errors: criticalErrors.length,
      });

    } catch (err) {
      console.error(`❌ Error testing ${vp.label}:`, err.message);
      results.push({ viewport: vp.label, error: err.message });
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('SMOKE TEST SUMMARY ACROSS ALL VIEWPORTS');
  console.log('======================================================');
  console.table(results);
}

run().catch(console.error);
