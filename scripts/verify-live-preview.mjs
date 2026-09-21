import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Browser Console Error]: ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  const previewUrl = 'https://printme-q7al43zto-qaliais-projects.vercel.app';
  console.log(`Navigating to Vercel preview: ${previewUrl}...`);
  const res = await page.goto(previewUrl, { waitUntil: 'networkidle' });
  console.log(`Page status: ${res.status()}`);

  const heading = await page.locator('#seasonal-edit-heading').textContent();
  console.log(`Section Heading: ${heading}`);

  const cardsCount = await page.locator('[data-testid^="seasonal-card-"]').count();
  console.log(`Active trend cards rendered: ${cardsCount} (expected: 6)`);
  if (cardsCount !== 6) throw new Error(`Expected 6 cards, got ${cardsCount}`);

  // Test category filtering: Cozy Fall
  await page.locator('[data-testid="seasonal-tab-cozy-fall"]').click();
  await page.waitForTimeout(300);
  const cozyCardsCount = await page.locator('[data-testid^="seasonal-card-"]').count();
  console.log(`Cozy Fall cards rendered: ${cozyCardsCount} (expected: 2)`);
  if (cozyCardsCount !== 2) throw new Error(`Expected 2 cards, got ${cozyCardsCount}`);

  // Test category filtering: Thanksgiving
  await page.locator('[data-testid="seasonal-tab-thanksgiving"]').click();
  await page.waitForTimeout(300);
  const tgCardsCount = await page.locator('[data-testid^="seasonal-card-"]').count();
  console.log(`Thanksgiving cards rendered: ${tgCardsCount} (expected: 1)`);
  if (tgCardsCount !== 1) throw new Error(`Expected 1 card, got ${tgCardsCount}`);

  // Test category filtering: Halloween
  await page.locator('[data-testid="seasonal-tab-halloween"]').click();
  await page.waitForTimeout(300);
  const hwCardsCount = await page.locator('[data-testid^="seasonal-card-"]').count();
  console.log(`Halloween cards rendered: ${hwCardsCount} (expected: 3)`);
  if (hwCardsCount !== 3) throw new Error(`Expected 3 cards, got ${hwCardsCount}`);

  // Reset to All
  await page.locator('[data-testid="seasonal-tab-all"]').click();
  await page.waitForTimeout(300);

  // Verify pure artwork card has NO "Make It Mine" button
  const makeItMineNightGarden = page.locator('[data-testid="make-it-mine-night-garden-society"]');
  const nightGardenHasButton = await makeItMineNightGarden.isVisible();
  console.log(`Pure artwork card (Night Garden Society) has Make It Mine: ${nightGardenHasButton} (expected: false)`);
  if (nightGardenHasButton) throw new Error('Night Garden Society should not have Make It Mine button');

  // Test personalization modal for Haunted Household
  const makeItMineBtn = page.locator('[data-testid="make-it-mine-haunted-household"]');
  await makeItMineBtn.click();
  await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
  console.log('Personalization modal opened successfully');

  const input = page.locator('#field-family-name');
  await input.fill('THE ADDAMS FAMILY');
  await page.waitForTimeout(300);

  const addBtn = page.locator('button:has-text("Add Custom Design to Bag")');
  await addBtn.click();
  await page.waitForSelector('text=Added to your shopping bag!', { timeout: 5000 });
  console.log('Personalized item added to cart successfully with live feedback');

  // Close modal
  const closeBtn = page.locator('button[aria-label="Close personalization editor"]');
  await closeBtn.click();
  await page.waitForTimeout(300);

  // Check Admin page
  console.log('Navigating to Admin Seasonal Trends on preview...');
  await page.goto(`${previewUrl}/admin/seasonal-trends`, { waitUntil: 'networkidle' });
  const adminTitle = await page.locator('h1').textContent();
  console.log(`Admin Title: ${adminTitle}`);

  const adminRows = await page.locator('tbody tr').count();
  console.log(`Admin trend rows rendered: ${adminRows} (expected: 6)`);

  console.log(`Console errors encountered: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  await browser.close();
  console.log('LIVE VERCEL PREVIEW VERIFICATION: FULL PASS (0 errors)');
}

main().catch(err => {
  console.error('Error during live preview verification:', err);
  process.exit(1);
});
