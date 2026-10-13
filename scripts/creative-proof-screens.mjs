#!/usr/bin/env node
/**
 * Captures homepage screenshots (desktop + mobile hero and full page) into
 * docs/creative-rebuild/screenshots. Usage:
 *   BASE_URL=http://localhost:3200 node scripts/creative-proof-screens.mjs [outDir]
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:3200';
const out = process.argv[2] ?? join(process.cwd(), 'docs', 'creative-rebuild', 'screenshots');
const path = process.env.SHOT_PATH ?? '/';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const name = path === '/' ? 'home' : path.slice(1).replaceAll('/', '-');
  await page.screenshot({ path: join(out, `${label}-${name}-hero.jpg`), type: 'jpeg', quality: 78 });
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += viewport.height * 0.7) {
    await page.evaluate((yy) => scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: join(out, `${label}-${name}-full.jpg`), type: 'jpeg', quality: 70, fullPage: true });
  console.log(label, name, 'height', height, errors.length ? errors.slice(0, 3) : 'no errors');
  await ctx.close();
}
await browser.close();
