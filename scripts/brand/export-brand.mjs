#!/usr/bin/env node
/**
 * Rasterises the generated brand SVGs (PNG exports + favicon.ico) and renders
 * the brand usage sheet. Run after build-logo.mjs:
 *   node scripts/brand/export-brand.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'brand', 'exports');
mkdirSync(out, { recursive: true });

const exports = [
  ['logo/printme-logo-horizontal.svg', 'printme-logo-horizontal-2400.png', 2400],
  ['logo/printme-logo-stacked.svg', 'printme-logo-stacked-1600.png', 1600],
  ['logo/printme-logo-horizontal-inverse.svg', 'printme-logo-horizontal-inverse-2400.png', 2400, '#111111'],
  ['logo/printme-logo-stacked-mono.svg', 'printme-logo-stacked-mono-1600.png', 1600],
  ['logo/printme-app-icon.svg', 'printme-app-icon-512.png', 512],
  ['logo/printme-app-icon.svg', 'printme-app-icon-180.png', 180],
  ['logo/printme-favicon.svg', 'printme-favicon-32.png', 32],
  ['logo/printme-favicon.svg', 'printme-favicon-16.png', 16],
  ['applications/social-post-1080x1350.svg', 'social-post-1080x1350.png', 1080],
  ['applications/email-header-600x160.svg', 'email-header-1200x320.png', 1200],
  ['applications/mailer-sticker.svg', 'mailer-sticker-1200.png', 1200],
  ['applications/neck-label-mono.svg', 'neck-label-mono-800.png', 800],
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const [src, dest, width, bg] of exports) {
  const svg = readFileSync(join(root, 'brand', src), 'utf8');
  const vb = /viewBox="([\d.\s-]+)"/.exec(svg)[1].split(/\s+/).map(Number);
  const height = Math.round((width / vb[2]) * vb[3]);
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<style>html,body{margin:0;background:${bg ?? 'transparent'}}img{display:block;width:${width}px;height:${height}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`,
  );
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(out, dest), omitBackground: !bg });
  console.log('png', dest, `${width}x${height}`);
}

// PNG-embedded ICO (16 + 32) for legacy favicon requests.
const icoImages = [16, 32].map((s) => readFileSync(join(out, `printme-favicon-${s}.png`)));
const header = Buffer.alloc(6 + icoImages.length * 16);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoImages.length, 4);
let offset = header.length;
icoImages.forEach((png, i) => {
  const s = [16, 32][i];
  const e = 6 + i * 16;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync(join(root, 'app', 'favicon.ico'), Buffer.concat([header, ...icoImages]));
writeFileSync(join(root, 'app', 'apple-icon.png'), readFileSync(join(out, 'printme-app-icon-180.png')));
console.log('wrote app/favicon.ico and app/apple-icon.png');

await page.setViewportSize({ width: 1600, height: 900 });
await page.goto(pathToFileURL(join(root, 'brand', 'brand-sheet.html')).href);
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, 'brand-sheet.png'), fullPage: true });
console.log('png brand-sheet.png');
await browser.close();
