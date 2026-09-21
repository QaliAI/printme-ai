import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 3005;
const BASE_URL = process.env.TEST_URL || `http://localhost:${PORT}`;
const screenshotDir = path.resolve('screenshots/seasonal-edit');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812, label: 'Mobile (375x812 - iPhone SE/Mini)' },
  { name: 'mobile-390', width: 390, height: 844, label: 'Mobile (390x844 - iPhone Standard)' },
  { name: 'tablet-768', width: 768, height: 1024, label: 'Tablet (768x1024 - iPad Portrait)' },
  { name: 'desktop-1440', width: 1440, height: 900, label: 'Desktop (1440x900 - Standard Display)' },
];

async function run() {
  console.log(`Starting Seasonal Edit Playwright testing against: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  let totalErrors = 0;

  for (const vp of VIEWPORTS) {
    console.log(`\n======================================================`);
    console.log(`Testing Viewport: ${vp.label}`);
    console.log(`======================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent:
        vp.width < 600
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`   [Console Error]: ${msg.text()}`);
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', (res) => {
      if (res.status() === 404) {
        console.warn(`   [404 Resource]: ${res.url()}`);
      }
    });

    try {
      // 1. Visit Homepage & Scroll to The Seasonal Edit
      console.log(`1. Navigating to homepage...`);
      const response = await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      console.log(`   Status: ${response.status()}`);

      const seasonalSection = page.locator('#seasonal-edit');
      await seasonalSection.waitFor({ state: 'visible', timeout: 10000 });
      console.log(`   #seasonal-edit section located and visible.`);

      // Scroll into view
      await seasonalSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Capture section screenshot
      const sectionShot = path.join(screenshotDir, `${vp.name}-seasonal-edit-all.png`);
      await page.screenshot({ path: sectionShot, fullPage: false });
      console.log(`   Captured screenshot: ${sectionShot}`);

      // Verify Title & Subheading
      const heading = await page.textContent('#seasonal-edit-heading');
      console.log(`   Heading: "${heading?.trim()}"`);

      // 2. Verify 6 Cards in 'All Seasonal' Tab
      const cards = page.locator('[data-testid^="seasonal-card-"]');
      const cardCount = await cards.count();
      console.log(`   Curated trend cards count (All): ${cardCount} (expected: 6)`);
      if (cardCount !== 6) throw new Error(`Expected 6 cards, got ${cardCount}`);

      // 3. Test Tab Filtering: Halloween
      console.log(`2. Testing category tabs filtering...`);
      await page.click('[data-testid="seasonal-tab-halloween"]');
      await page.waitForTimeout(300);
      const hCards = await page.locator('[data-testid^="seasonal-card-"]').count();
      console.log(`   Halloween cards visible: ${hCards} (expected: 3)`);
      if (hCards !== 3) throw new Error(`Expected 3 Halloween cards, got ${hCards}`);

      // Test Cozy Fall Tab
      await page.click('[data-testid="seasonal-tab-cozy-fall"]');
      await page.waitForTimeout(300);
      const fCards = await page.locator('[data-testid^="seasonal-card-"]').count();
      console.log(`   Cozy Fall cards visible: ${fCards} (expected: 2)`);
      if (fCards !== 2) throw new Error(`Expected 2 Cozy Fall cards, got ${fCards}`);

      // Test Thanksgiving Tab
      await page.click('[data-testid="seasonal-tab-thanksgiving"]');
      await page.waitForTimeout(300);
      const tgCards = await page.locator('[data-testid^="seasonal-card-"]').count();
      console.log(`   Thanksgiving cards visible: ${tgCards} (expected: 1)`);
      if (tgCards !== 1) throw new Error(`Expected 1 Thanksgiving card, got ${tgCards}`);

      // Reset to All
      await page.click('[data-testid="seasonal-tab-all"]');
      await page.waitForTimeout(300);

      // 4. Verify "Make It Mine" button logic:
      // Should exist on haunted-household, library-of-lost-hours, midnight-hayride, field-notes-after-dark, leftovers-league
      // Should NOT exist on night-garden-society
      const makeItMineHaunted = page.locator('[data-testid="make-it-mine-haunted-household"]');
      const makeItMineNightGarden = page.locator('[data-testid="make-it-mine-night-garden-society"]');

      const hasHauntedMine = await makeItMineHaunted.isVisible();
      const hasNightGardenMine = await makeItMineNightGarden.isVisible();
      console.log(`   "Make It Mine" on Haunted Household: ${hasHauntedMine} (expected: true)`);
      console.log(`   "Make It Mine" on Night Garden Society: ${hasNightGardenMine} (expected: false)`);

      if (!hasHauntedMine) throw new Error(`Expected Make It Mine button on haunted-household`);
      if (hasNightGardenMine) throw new Error(`Make It Mine should NOT appear on night-garden-society`);

      // 5. Test Interactive Personalization Modal (Desktop & Mobile)
      console.log(`3. Testing Personalization Modal...`);
      await makeItMineHaunted.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      console.log(`   Personalization Modal opened.`);

      // Type in custom family name
      const familyInput = page.locator('#field-family-name');
      await familyInput.fill('THE ADAMS FAMILY');
      await page.waitForTimeout(300);

      // Capture modal screenshot
      const modalShot = path.join(screenshotDir, `${vp.name}-personalization-modal.png`);
      await page.screenshot({ path: modalShot, fullPage: false });
      console.log(`   Captured modal screenshot: ${modalShot}`);

      // Click "Add Custom Design to Bag"
      const addBtn = page.locator('button:has-text("Add Custom Design to Bag")');
      await addBtn.click();
      await page.waitForSelector('text=Added to your shopping bag!', { timeout: 5000 });
      console.log(`   Successfully added custom design to bag with live confirmation!`);

      // Close modal
      const closeBtn = page.locator('button[aria-label="Close personalization editor"]');
      await closeBtn.click();
      await page.waitForTimeout(300);

      console.log(`   Console errors in ${vp.label}: ${consoleErrors.length}`);
      totalErrors += consoleErrors.length;
    } catch (err) {
      console.error(`   FAIL on viewport ${vp.name}:`, err);
      totalErrors++;
    } finally {
      await context.close();
    }
  }

  await browser.close();

  if (totalErrors === 0) {
    console.log(`\nALL RESPONSIVE VIEWPORT & PERSONALIZATION SMOKE TESTS PASSED WITH 0 CONSOLE ERRORS!`);
    process.exit(0);
  } else {
    console.error(`\nSmoke tests finished with ${totalErrors} issues.`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
