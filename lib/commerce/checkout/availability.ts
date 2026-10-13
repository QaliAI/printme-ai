/**
 * Whether the storefront may offer checkout. Mirrors the gates in
 * stripe-gateway.ts (checkout + persistence enabled) so the cart never shows
 * a "Proceed to Checkout" that can only fail. The e2e harness runs its own
 * dry-run checkout and is never enabled in production builds.
 */
export function isCheckoutAvailable(e2eSecret?: string) {
  if (process.env.COMMERCE_CHECKOUT_ENABLED === 'true' && process.env.COMMERCE_PERSISTENCE_ENABLED === 'true') {
    return true;
  }
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.COMMERCE_E2E_TEST_MODE === 'true' &&
    Boolean(process.env.COMMERCE_E2E_TEST_SECRET) &&
    e2eSecret === process.env.COMMERCE_E2E_TEST_SECRET
  );
}
