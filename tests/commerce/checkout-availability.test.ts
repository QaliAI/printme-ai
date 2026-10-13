import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCheckoutAvailable } from '@/lib/commerce/checkout/availability';

describe('checkout availability', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off unless both checkout and persistence gates are on', () => {
    vi.stubEnv('COMMERCE_E2E_TEST_MODE', 'false');
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'true');
    vi.stubEnv('COMMERCE_PERSISTENCE_ENABLED', 'false');
    expect(isCheckoutAvailable()).toBe(false);
    vi.stubEnv('COMMERCE_PERSISTENCE_ENABLED', 'true');
    expect(isCheckoutAvailable()).toBe(true);
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'false');
    expect(isCheckoutAvailable()).toBe(false);
  });

  it('allows the e2e dry-run harness only with the right secret outside production', () => {
    vi.stubEnv('COMMERCE_CHECKOUT_ENABLED', 'false');
    vi.stubEnv('COMMERCE_E2E_TEST_MODE', 'true');
    vi.stubEnv('COMMERCE_E2E_TEST_SECRET', 'secret');
    expect(isCheckoutAvailable('secret')).toBe(true);
    expect(isCheckoutAvailable('wrong')).toBe(false);
    vi.stubEnv('NODE_ENV', 'production');
    expect(isCheckoutAvailable('secret')).toBe(false);
  });
});
