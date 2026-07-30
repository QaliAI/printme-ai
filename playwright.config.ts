import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './output/playwright/test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: './output/playwright/report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    launchOptions: {
      args: ['--disable-gpu'],
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/shop-v2',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_COMMERCE_V2_ENABLED: 'true',
      NEXT_PUBLIC_HOMEPAGE_V2_ENABLED: 'true',
      NEXT_PUBLIC_UNIFIED_CREATE_ENABLED: 'true',
      NEXT_PUBLIC_STUDIO_ENABLED: 'true',
      COMMERCE_E2E_TEST_MODE: 'true',
      COMMERCE_E2E_TEST_SECRET: 'printme-local-e2e-secret',
      COMMERCE_CHECKOUT_ENABLED: 'true',
      STRIPE_SECRET_KEY: 'sk_test_local_e2e_only',
      STRIPE_WEBHOOK_SECRET: 'whsec_local_e2e_only',
      PRINTIFY_FULFILLMENT_MODE: 'dry-run',
      STUDIO_E2E_TEST_MODE: 'true',
      STUDIO_E2E_TEST_SECRET: 'printme-local-studio-e2e-secret',
    },
  },
});
