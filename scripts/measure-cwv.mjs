#!/usr/bin/env node
/**
 * Lab Core Web Vitals for a page under mobile throttling (CDP):
 * 4x CPU slowdown, ~1.6 Mbps / 150 ms RTT ("Slow 4G"-like). Reports LCP,
 * CLS, transfer size and long-task total; INP needs field data, so we report
 * the processing delay of a synthetic tap on the primary CTA instead.
 * Usage: BASE_URL=http://localhost:3300 node scripts/measure-cwv.mjs [path]
 */
import { chromium } from '@playwright/test';

const url = (process.env.BASE_URL ?? 'http://localhost:3300') + (process.argv[2] ?? '/');
const browser = await chromium.launch();
for (const [label, viewport, throttle] of [
  ['mobile (4x CPU, slow 4G)', { width: 390, height: 844 }, true],
  ['desktop (unthrottled)', { width: 1440, height: 900 }, false],
]) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (throttle) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    }
    let bytes = 0;
    cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
    await page.addInitScript(() => {
      window.__cwv = { lcp: 0, cls: 0, lcpEl: '', longTasks: 0 };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__cwv.lcp = e.startTime; window.__cwv.lcpEl = (e.element?.tagName ?? '') + ' ' + (e.element?.className?.toString?.().slice(0, 40) ?? '') + ' ' + (e.url ?? '').slice(-40); } }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cwv.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__cwv.longTasks += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
    await page.waitForTimeout(3500);
    const tap = await page.evaluate(() => new Promise((resolve) => {
      const target = document.querySelector('[data-testid="hero-make"]') ?? document.body;
      new PerformanceObserver((l) => { const e = l.getEntries()[0]; if (e) resolve(Math.round(e.duration)); }).observe({ type: 'event', durationThreshold: 16, buffered: false });
      target.addEventListener('pointerdown', (ev) => ev.preventDefault(), { once: true });
      setTimeout(() => resolve('<16'), 1500);
      target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    }));
    const m = await page.evaluate(() => window.__cwv);
    runs.push({ lcp: Math.round(m.lcp), cls: +m.cls.toFixed(3), tbt: Math.round(m.longTasks), kb: Math.round(bytes / 1024), tap, lcpEl: m.lcpEl });
    await ctx.close();
  }
  runs.sort((a, b) => a.lcp - b.lcp);
  console.log(label, JSON.stringify(runs[1]), 'all LCP:', runs.map((r) => r.lcp).join('/'));
}
await browser.close();
