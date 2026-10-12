import { chromium } from 'playwright';
import path from 'node:path';

async function testLiveCreate() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const failedReqs = [];
  page.on('console', m => consoleLogs.push({ type: m.type(), text: m.text() }));
  page.on('requestfailed', r => failedReqs.push({ url: r.url(), err: r.failure()?.errorText }));
  page.on('response', async res => {
    if (res.status() >= 400) {
      let body = '';
      try { body = await res.text(); } catch (e) {}
      console.log(`HTTP ${res.status()} from ${res.url()}:`, body.slice(0, 300));
    }
  });

  console.log('Navigating to https://printme.ai/create...');
  await page.goto('https://printme.ai/create', { waitUntil: 'networkidle' });

  const uploadFixture = path.resolve('public/landing/transformations/pet-original.webp');
  console.log('Uploading image fixture:', uploadFixture);

  const fileInput = page.getByLabel('Upload a photo or artwork');
  await fileInput.setInputFiles(uploadFixture);

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'audit/live-investigation/create-after-upload.png', fullPage: true });

  const previewStage = page.getByTestId('create-preview-stage');
  const isPreviewVisible = await previewStage.isVisible();
  console.log('Is create-preview-stage visible?', isPreviewVisible);

  // Check buttons/options
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
  });
  console.log('Available buttons on create page:', buttons);

  // Take screenshot
  await page.screenshot({ path: 'audit/live-investigation/create-interactive-stage.png' });

  // Check product switching
  console.log('Testing product switching...');
  try {
    const productButton = page.getByRole('button', { name: /Product/i }).first();
    if (await productButton.isVisible()) {
      await productButton.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('Product button click error:', e.message);
  }

  // Check add to cart
  const addToCartBtn = page.getByTestId('create-add-to-cart');
  console.log('Is add to cart button visible?', await addToCartBtn.isVisible());
  if (await addToCartBtn.isVisible()) {
    await addToCartBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'audit/live-investigation/create-after-add-to-cart.png' });
  }

  console.log('Console logs during test:', consoleLogs);
  console.log('Failed requests during test:', failedReqs.filter(r => !r.url.includes('_rsc=')));

  await browser.close();
}

testLiveCreate().catch(console.error);
