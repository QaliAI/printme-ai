import path from 'node:path';
import { expect, test } from '@playwright/test';

const uploadFixture = path.resolve(
  'public/landing/transformations/pet-original.webp',
);

test('authorized Studio admin publishes a design to the public gallery', async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: 'printme-studio-e2e-secret',
      value: 'printme-local-studio-e2e-secret',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
  await page.goto('/studio/designs/new');
  await expect(
    page.getByRole('heading', { level: 1, name: 'New design' }),
  ).toBeVisible();

  await page
    .getByLabel('Upload curated design')
    .setInputFiles(uploadFixture);
  await expect(page.getByText(/pet-original\.webp/i)).toBeVisible();

  const fields = {
    Title: 'Studio Review Design',
    'Artist or source': 'PrintMe QA',
    'Usage rights': 'Internal review license',
    'Alt text': 'Bright studio review portrait artwork',
    'Tags, comma separated': 'review, studio',
    'SEO title': 'Studio Review Design',
    'SEO description':
      'A published design created by the secure local Studio review flow.',
    Description:
      'A complete curated design used to verify the Studio publishing workflow.',
    'Rights documentation notes':
      'Internal fixture approved for automated local review only.',
  };
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }

  await page.getByRole('button', { name: /Everyday Tee/ }).click();
  await page.getByLabel('Placement scale').fill('0.9');
  await expect(page.getByTestId('instant-preview')).toHaveAttribute(
    'data-product-id',
    'everyday-tee',
  );
  await expect(page.getByText('Prepublication checklist')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish' })).toBeEnabled();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(
    page.getByRole('status'),
  ).toContainText('Published. The public design route');

  await page.goto('/designs/studio-review-design');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Studio Review Design',
    }),
  ).toBeVisible();
  await expect(page.getByText('PrintMe QA')).toBeVisible();
});
