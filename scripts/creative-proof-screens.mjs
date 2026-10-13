#!/usr/bin/env node
/**
 * Captures creative-proof screenshots (desktop + mobile, full page, wall
 * sequence beats, reduced motion) into docs/creative-rebuild/screenshots.
 * Usage: BASE_URL=http://localhost:3200 node scripts/creative-proof-screens.mjs [label]
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:3200';
const out = join(process.cwd(), 'docs', 'creative-rebuild', 'screenshots');
mkdirSync(out, { recursive: true });
const only = process.argv[2];

const browser = await chromium.launch();
async function shoot(name, viewport, fn, opts = {}) {
  if (only && !name.startsWith(only)) return;
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + (opts.path ?? '/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await fn(page);
  if (errors.length) console.log(name, 'errors:', errors.slice(0, 5));
  await ctx.close();
}

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

for (const [label, vp] of [['desktop', desktop], ['mobile', mobile]]) {
  await shoot(`${label}-hero`, vp, async (page) => {
    await page.screenshot({ path: join(out, `${label}-01-hero.png`) });
  });
  await shoot(`${label}-wall`, vp, async (page) => {
    const section = page.getByTestId('rebel-wall-sequence');
    const box = await section.boundingBox();
    const top = box.y + (await page.evaluate(() => scrollY));
    const travel = box.height - vp.height;
    for (const [i, p] of [0.2, 0.47, 0.68, 0.98].entries()) {
      await page.evaluate((y) => scrollTo(0, y), top + travel * p);
      await page.waitForTimeout(700);
      await page.screenshot({ path: join(out, `${label}-02-wall-beat-${i + 1}.png`) });
    }
  });
  await shoot(`${label}-full`, vp, async (page) => {
    // scroll through so reveal-on-view sections are shown before the full capture
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += vp.height * 0.6) {
      await page.evaluate((yy) => scrollTo(0, yy), y);
      await page.waitForTimeout(160);
    }
    await page.waitForTimeout(900);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: join(out, `${label}-00-fullpage.png`), fullPage: true });
  });
}
await shoot('desktop-reduced', desktop, async (page) => {
  await page.screenshot({ path: join(out, 'desktop-reduced-motion-fullpage.png'), fullPage: true });
}, { reduced: true });
await browser.close();
console.log('done');
