import { expect, test } from '@playwright/test';

test('Homepage V2 exposes the commerce-first path with real catalog data', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Turn (your photo into art|a favorite photo)/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Create (with Your Photo|Yours)/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Shop (Fall )?Designs/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/Custom (products|items) (start at|from) \$19/),
  ).toBeVisible();

  const heroSwitcher = page.getByTestId('home-hero-switcher');
  await page.getByTestId('home-hero-product-everyday-tee').click();
  await expect(heroSwitcher).toContainText('Everyday Tee from $34');
  await page.getByTestId('home-hero-product-keepsake-mug').click();
  await expect(heroSwitcher).toContainText('Keepsake Mug from $19');
  await expect(
    heroSwitcher.getByRole('img', { name: /personalized ceramic mug/i }),
  ).toBeVisible();

  const showcase = page.getByTestId('home-commerce-showcase');
  await expect(showcase).toContainText(
    /Boo Crew|Sunday Sidekick|Haunted Household|Autumn State of Mind/,
  );
  await page.getByTestId('home-featured-product-everyday-tee').click();
  await expect(
    showcase.getByTestId('instant-preview'),
  ).toHaveAttribute('data-product-id', 'everyday-tee');
  await expect(
    showcase.getByRole('link', { name: 'Configure' }),
  ).toBeVisible();
});

test('Homepage V2 keeps mobile commerce controls reachable', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'mobile-chromium',
    'Mobile geometry is validated once.',
  );

  await page.goto('/');
  const primary = page.getByRole('link', { name: /Create (with Your Photo|Yours)/i }).first();
  const stickyBar = page.getByTestId('home-mobile-commerce-bar');
  await expect(primary).toBeVisible();
  await expect(stickyBar).toBeVisible();

  const primaryBox = await primary.boundingBox();
  const stickyCreateBox = await stickyBar
    .getByRole('link', { name: /Create (with Your Photo|Yours)/i })
    .boundingBox();
  expect(primaryBox?.height).toBeGreaterThanOrEqual(44);
  expect(stickyCreateBox?.height).toBeGreaterThanOrEqual(44);
  expect(primaryBox?.y).toBeLessThan(812);
});
