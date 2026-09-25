import { chromium } from 'playwright';

const BASE_URL = 'https://printme-1nsvyv0b9-qaliais-projects.vercel.app';
const pages = ['/', '/shop-v2', '/designs/boo-crew', '/products'];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`Failed URL [${res.status()}]: ${res.url()}`);
    }
  });

  for (const p of pages) {
    console.log(`Visiting ${p}...`);
    await page.goto(`${BASE_URL}${p}`, { waitUntil: 'networkidle' });
  }

  await browser.close();
}

main().catch(console.error);
