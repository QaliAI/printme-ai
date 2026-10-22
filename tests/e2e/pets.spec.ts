import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const dogPhoto = path.resolve('public/landing/transformations/pet-original.webp');
const catPhoto = path.resolve('public/samples/ginger-cat.jpg');
const pngPhoto = path.resolve('public/samples/ginger-cat-cutout.png');

async function forbidPaidRequests(page: Page) {
  const requests: string[] = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/commerce/analytics') {
      await route.fulfill({ status: 204 });
      return;
    }
    if (pathname === '/api/pets/readiness' && request.method() === 'GET') {
      await route.continue();
      return;
    }
    if (/\/(download|original)(\/|$)/.test(pathname)
      || (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())
      && /\/(pets|checkout|generate-design|regenerate|generate|upload|upload-photo|assets)(\/|$)/.test(pathname))) {
      requests.push(`${request.method()} ${pathname}`);
    }
    await route.abort();
  });
  await page.route('https://api.openai.com/**', async (route) => {
    requests.push('Direct image provider request');
    await route.abort();
  });
  return requests;
}

async function openPhotoStep(page: Page) {
  await page.goto('/pets/create');
  await expect(page.getByRole('heading', { level: 1, name: 'MAKE A LITTLE LEGEND.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByTestId('pets-photo-input')).toBeAttached();
}

test('Pets has a real studio entry, approved keepsakes, and honest gift preparation', async ({ page }) => {
  const writes = await forbidPaidRequests(page);
  await page.goto('/pets');
  await expect(page.getByRole('heading', { level: 1, name: 'YOUR PET. YOUR PERSON. YOUR MASTERPIECE.', exact: true })).toBeVisible();
  const cta = page.getByRole('link', { name: 'MAKE MY PET PORTRAIT', exact: true }).first();
  await expect(cta).toHaveAttribute('href', '/pets/create');
  await cta.click();
  await expect(page).toHaveURL(/\/pets\/create$/);
  await expect(page.getByRole('heading', { level: 1, name: 'MAKE A LITTLE LEGEND.' })).toBeVisible();

  for (const route of ['/pets/keepsakes', '/pets/gift']) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('main')).toContainText(/paused|not yet available|not available|prepar|coming/i);
  }
  expect(writes).toEqual([]);
});

test('the style gallery exposes 24 distinct looks and useful category filters', async ({ page }) => {
  await page.goto('/pets');
  const styles = page.getByTestId('pets-style-card');
  await expect(styles).toHaveCount(24);
  const links = await styles.evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));
  expect(new Set(links).size).toBe(24);
  expect(links.every((link) => link?.startsWith('/pets/create?style='))).toBe(true);
  const filters = page.getByTestId('pets-category-filter');
  await expect(filters).toHaveCount(9);
  await filters.nth(1).click();
  await expect.poll(() => styles.count()).toBeGreaterThan(0);
  await expect.poll(() => styles.count()).toBeLessThan(24);
  await filters.filter({ hasText: /^All$/ }).click();
  await expect(styles).toHaveCount(24);
  await styles.first().click();
  await expect(page).toHaveURL(/\/pets\/create\?style=.+/);
});

test('an explicit Together in blue style link overrides a restored Fuzz club draft', async ({ page }) => {
  const writes = await forbidPaidRequests(page);
  await page.goto('/pets/create?style=fuzz-club');
  const fuzz = page.getByRole('button', { name: /^Fuzz club / });
  await expect(fuzz).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.goto('/pets/create');
  await expect(fuzz).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/pets');
  await page.getByTestId('pets-style-card').filter({ hasText: 'Together in blue' }).click();
  await expect(page).toHaveURL(/\/pets\/create\?style=together-in-blue$/);
  await expect(page.getByRole('button', { name: /^Together in blue / })).toHaveAttribute('aria-pressed', 'true');
  await expect(fuzz).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Together in blue / })).toHaveAttribute('aria-pressed', 'true');
  expect(writes).toEqual([]);
});

test('a person-only brief stays on Photos until at least one pet is included', async ({ page }) => {
  const writes = await forbidPaidRequests(page);
  await openPhotoStep(page);
  await page.getByRole('combobox', { name: 'Photo subject', exact: true }).selectOption('person');
  await page.getByTestId('pets-photo-input').setInputFiles(catPhoto);
  await expect(page.getByTestId('pets-subject-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toHaveText('Include at least one pet photo before continuing.');
  await expect(page.getByRole('button', { name: '02 Photos', exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', { name: '03 Review', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Photo subject', exact: true }).selectOption('pet');
  await page.getByTestId('pets-photo-input').setInputFiles(dogPhoto);
  await expect(page.getByTestId('pets-subject-card')).toHaveCount(2);
  await expect(page.getByRole('button', { name: '03 Review', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'One last little check.', exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test('the transformation comparison changes with a keyboard-accessible range', async ({ page }) => {
  await page.goto('/pets');
  const range = page.getByRole('slider', { name: 'Reveal portrait transformation' });
  await expect(range).toBeVisible();
  await range.fill('25');
  await expect(range).toHaveValue('25');
  await range.focus();
  await range.press('ArrowRight');
  await expect(range).not.toHaveValue('25');
});

test('Pets is reachable through the appropriate desktop or mobile navigation', async ({ page }, testInfo) => {
  await page.goto('/');
  const navName = testInfo.project.name === 'desktop-chromium' ? 'Primary navigation' : 'Mobile navigation';
  const pets = page.getByRole('navigation', { name: navName, exact: true }).getByRole('link', { name: 'Pets', exact: true });
  await expect(pets).toBeVisible();
  await expect(pets).toHaveAttribute('href', '/pets');
  await pets.click();
  await expect(page).toHaveURL(/\/pets$/);
});

test('separate subjects can be named, reordered, rotated, removed, and restored privately', async ({ page }) => {
  const writes = await forbidPaidRequests(page);
  await openPhotoStep(page);
  await page.getByTestId('pets-photo-input').setInputFiles(dogPhoto);
  const cards = page.getByTestId('pets-subject-card');
  await expect(cards).toHaveCount(1);
  await cards.nth(0).getByLabel('Subject name', { exact: true }).fill('Maple');
  await cards.nth(0).getByRole('combobox', { name: 'Photo crop', exact: true }).selectOption('square');
  await page.getByRole('combobox', { name: 'Photo subject', exact: true }).selectOption('person');
  await page.getByTestId('pets-photo-input').setInputFiles(catPhoto);
  await expect(cards).toHaveCount(2);
  await cards.nth(1).getByLabel('Subject name', { exact: true }).fill('Alex');
  await cards.nth(1).getByRole('button', { name: 'Move photo up', exact: true }).click();
  await expect(cards.nth(0).getByLabel('Subject name', { exact: true })).toHaveValue('Alex');
  const preview = cards.nth(0).locator('img');
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const beforeSize = await preview.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight]);
  const beforeRotation = await preview.getAttribute('src');
  await cards.nth(0).getByRole('button', { name: 'Rotate photo', exact: true }).click();
  await expect(preview).not.toHaveAttribute('src', beforeRotation ?? '');
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])).toEqual([beforeSize[1], beforeSize[0]]);
  await cards.nth(0).getByRole('button', { name: 'Remove photo', exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.nth(0).getByLabel('Subject name', { exact: true })).toHaveValue('Maple');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '02 Photos', exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.nth(0).getByLabel('Subject name', { exact: true })).toHaveValue('Maple');
  await expect(cards.nth(0).getByRole('combobox', { name: 'Photo crop', exact: true })).toHaveValue('square');
  expect(writes).toEqual([]);
});

test('uploads reject unsupported or corrupted files and enforce the four-subject limit', async ({ page }) => {
  await forbidPaidRequests(page);
  await openPhotoStep(page);
  const input = page.getByTestId('pets-photo-input');
  await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a photo') });
  await expect(page.locator('main').getByRole('alert')).toContainText(/JPEG|JPG|PNG|WebP/i);
  await expect(page.getByTestId('pets-subject-card')).toHaveCount(0);
  await input.setInputFiles({ name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('pets-subject-card')).toHaveCount(0);
  await input.setInputFiles([dogPhoto, catPhoto, pngPhoto, dogPhoto]);
  await expect(page.getByTestId('pets-subject-card')).toHaveCount(4);
  await input.setInputFiles(catPhoto);
  await expect(page.locator('main').getByRole('alert')).toContainText(/4|four/i);
  await expect(page.getByTestId('pets-subject-card')).toHaveCount(4);
});

test('review never spends image credits or starts payment while generation is paused', async ({ page }) => {
  const writes = await forbidPaidRequests(page);
  const readiness = await page.request.get('/api/pets/readiness');
  expect(readiness.status()).toBe(200);
  expect((await readiness.json()).enabled).toBe(false);
  await openPhotoStep(page);
  await page.getByTestId('pets-photo-input').setInputFiles(dogPhoto);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Portrait generation is paused', exact: true })).toBeDisabled();
  await expect(page.getByTestId('pets-generation-status')).toContainText(/paused|unavailable/i);
  await page.getByRole('button', { name: '04 Portrait', exact: true }).click();
  await expect(page.getByTestId('pets-generation-status')).toContainText(/paused|unavailable/i);
  expect(writes).toEqual([]);
});

type SyntheticRequest = { requestId: string; references: { dataUrl: string; role: string; label: string }[] };
const syntheticJobId = 'd34bb9d1-4444-4555-8999-789123456789';
// A deliberately synthetic static preview. No provider, payment or original-artwork request is allowed.
const syntheticPreview = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#f2ede0"/><text x="25" y="250" font-family="sans-serif" font-size="30">SYNTHETIC QA</text><text x="25" y="300" font-family="sans-serif" font-size="30">PRINTME · PREVIEW</text><text x="25" y="350" font-family="sans-serif" font-size="20">NOT PRODUCTION ARTWORK</text></svg>';

async function prepareSyntheticGeneration(page: Page, status: 'completed' | 'failed' | 'uncertain') {
  const blocked = await forbidPaidRequests(page);
  const submitted: SyntheticRequest[] = [];
  await page.route('**/api/pets/readiness', (route) => route.fulfill({ status: 200, json: { enabled: true } }));
  await page.route('**/api/pets/generations', async (route) => {
    if (route.request().method() !== 'POST') return route.abort();
    submitted.push(route.request().postDataJSON() as SyntheticRequest);
    await route.fulfill(status === 'failed'
      ? { status: 503, json: { error: 'Synthetic provider unavailable. Your brief is saved.' } }
      : { status: 200, json: { jobId: syntheticJobId, status, downloadAvailable: false } });
  });
  await page.route(`**/api/pets/generations/${syntheticJobId}/preview`, (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: syntheticPreview }));
  await openPhotoStep(page);
  await page.getByTestId('pets-photo-input').setInputFiles(catPhoto);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const generate = page.getByRole('button', { name: 'Generate watermarked preview', exact: true });
  await expect(generate).toBeDisabled();
  await page.getByRole('checkbox', { name: /I have permission to use these photos/ }).check();
  await generate.click();
  return { blocked, submitted };
}

test('a synthetic successful preview preserves versions and favorites without offering originals or payment', async ({ page }) => {
  const { blocked, submitted } = await prepareSyntheticGeneration(page, 'completed');
  const preview = page.getByRole('img', { name: 'Your private watermarked pet portrait preview', exact: true });
  await expect(preview).toBeVisible();
  await expect(page.getByTestId('pets-generation-status')).toContainText('Your watermarked preview is ready');
  await expect(page.getByRole('button', { name: 'Original downloads are not yet available', exact: true })).toBeDisabled();
  await expect(page.locator('a[download], a[href*="/checkout"], a[href*="/download"], a[href*="/original"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Favorite this portrait', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Favorite portrait 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(submitted).toHaveLength(1);
  expect(submitted[0].references).toHaveLength(1);
  expect(submitted[0].references[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  expect(submitted[0].references[0].dataUrl.length).toBeLessThanOrEqual(750_000);
  await page.reload();
  await page.getByRole('button', { name: '04 Portrait', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Favorite portrait 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '1. Together in blue', exact: true }).click();
  await expect(preview).toBeVisible();
  expect(submitted).toHaveLength(1);
  expect(blocked).toEqual([]);
});

for (const status of ['failed', 'uncertain'] as const) {
  test(`a synthetic ${status} generation keeps the brief and retries the same request identity`, async ({ page }) => {
    const { blocked, submitted } = await prepareSyntheticGeneration(page, status);
    if (status === 'failed') {
      await expect(page.locator('main').getByRole('alert')).toHaveText('Synthetic provider unavailable. Your brief is saved.');
    } else {
      await expect(page.getByTestId('pets-generation-status')).toContainText('A new paid generation will not be started automatically');
    }
    await expect(page.getByRole('img', { name: 'Your private watermarked pet portrait preview', exact: true })).toHaveCount(0);
    expect(submitted).toHaveLength(1);
    const requestId = submitted[0].requestId;
    expect(requestId).toMatch(/^[a-f0-9-]{36}$/i);
    await page.reload();
    await page.getByRole('button', { name: '02 Photos', exact: true }).click();
    await expect(page.getByTestId('pets-subject-card')).toHaveCount(1);
    await page.getByRole('button', { name: '03 Review', exact: true }).click();
    await page.getByRole('checkbox', { name: /I have permission to use these photos/ }).check();
    await page.getByRole('button', { name: 'Generate watermarked preview', exact: true }).click();
    await expect.poll(() => submitted.length).toBe(2);
    expect(submitted[1].requestId).toBe(requestId);
    expect(blocked).toEqual([]);
  });
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`Pets review screenshots and usable controls at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Explicit viewport captures run once.');
    const captureDirectory = path.resolve('output/pets/review', String(viewport.width));
    mkdirSync(captureDirectory, { recursive: true });
    const capture = async (name: string, fullPage = true) => {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({ path: path.join(captureDirectory, `${name}.png`), fullPage, animations: 'disabled' });
    };
    const writes = await forbidPaidRequests(page);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/pets');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const cta = page.getByRole('link', { name: 'MAKE MY PET PORTRAIT', exact: true }).first();
    const ctaBox = await cta.boundingBox();
    expect(ctaBox?.height).toBeGreaterThanOrEqual(44);
    await capture('pets-hero', false);
    await capture('pets-full');
    await cta.click();
    await expect(page.getByRole('heading', { level: 1, name: 'MAKE A LITTLE LEGEND.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await capture('pets-create');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByTestId('pets-photo-input').setInputFiles(dogPhoto);
    await expect(page.getByTestId('pets-subject-card')).toHaveCount(1);
    const thumbnail = page.getByTestId('pets-subject-card').locator('img');
    await expect(thumbnail).toBeVisible();
    await expect.poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true);
    await expect(thumbnail).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
    const sourceDimensions = await thumbnail.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight]);
    expect(sourceDimensions).toEqual([1200, 1200]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await capture('pets-photos');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByTestId('pets-generation-status')).toContainText(/paused|unavailable/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await capture('pets-review');
    if (viewport.width === 390 || viewport.width === 1440) {
      for (const route of ['keepsakes', 'gift']) {
        await page.goto(`/pets/${route}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
        await capture(`pets-${route}`);
      }
      await page.goto('/');
      const promo = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Your best friend. Immortalized.', exact: true }) });
      await expect(promo).toBeVisible();
      await expect(promo.getByRole('link', { name: /Meet PrintMe Pets/ })).toHaveAttribute('href', '/pets');
      await promo.scrollIntoViewIfNeeded();
      const promoImage = promo.getByRole('img', { name: 'Original punk whippet portrait example', exact: true });
      await expect(promoImage).toBeVisible();
      await expect.poll(() => promoImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      await capture('homepage-with-pets');
      await promo.screenshot({ path: path.join(captureDirectory, 'homepage-pets-promo.png'), animations: 'disabled' });
    }
    expect(writes).toEqual([]);
  });
}
