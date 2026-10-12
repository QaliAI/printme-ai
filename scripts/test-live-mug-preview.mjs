import { chromium } from 'playwright';
import path from 'node:path';

async function testMugPreview() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to https://printme.ai/create...');
  await page.goto('https://printme.ai/create', { waitUntil: 'networkidle' });

  const uploadFixture = path.resolve('public/landing/transformations/pet-original.webp');
  const fileInput = page.getByLabel('Upload a photo or artwork');
  await fileInput.setInputFiles(uploadFixture);
  await page.waitForTimeout(2000);

  // Switch to Keepsake Mug
  console.log('Selecting Keepsake Mug...');
  await page.getByRole('button', { name: /Product/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Keepsake Mug/i }).click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'audit/live-investigation/live-mug-preview.png', fullPage: true });

  // Switch to Everyday Tee
  console.log('Selecting Everyday Tee...');
  await page.getByRole('button', { name: /Product/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Everyday Tee/i }).click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'audit/live-investigation/live-tee-preview.png', fullPage: true });

  await browser.close();
}

testMugPreview().catch(console.error);
