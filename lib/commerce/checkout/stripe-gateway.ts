import 'server-only';

import Stripe from 'stripe';
import type {
  CheckoutGateway,
} from './service';

export function getStripeSecretKey() {
  const mode = process.env.STRIPE_MODE || 'test';
  const secret = process.env.STRIPE_SECRET_KEY;

  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY is required.');
  }

  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  const isDevelopmentOrPreview =
    vercelEnv === 'preview' || vercelEnv === 'development' || nodeEnv === 'development';

  if (mode === 'test') {
    if (!secret.startsWith('sk_test_')) {
      throw new Error('STRIPE_MODE is test, but STRIPE_SECRET_KEY does not start with sk_test_.');
    }
    return secret;
  }

  if (mode === 'live') {
    if (!secret.startsWith('sk_live_')) {
      throw new Error('STRIPE_MODE is live, but STRIPE_SECRET_KEY does not start with sk_live_.');
    }
    if (isDevelopmentOrPreview) {
      throw new Error('Live Stripe keys are prohibited in development and preview environments.');
    }
    if (process.env.STRIPE_LIVE_RELEASE_APPROVED !== 'true') {
      throw new Error('Live Stripe mode requires explicit release flag STRIPE_LIVE_RELEASE_APPROVED=true.');
    }
    return secret;
  }

  throw new Error(`Invalid STRIPE_MODE: ${mode}. Must be 'test' or 'live'.`);
}

function getStripeTestSecret() {
  return getStripeSecretKey();
}

export function assertCheckoutEnabled() {
  if (
    process.env.COMMERCE_CHECKOUT_ENABLED !== 'true' ||
    process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true'
  ) {
    throw new Error('Secure checkout is disabled until migrations are enabled.');
  }
}

export class StripeTestCheckoutGateway implements CheckoutGateway {
  async createSession(
    input: Parameters<CheckoutGateway['createSession']>[0],
  ) {
    assertCheckoutEnabled();
    const stripe = new Stripe(getStripeTestSecret(), {
      apiVersion: '2026-04-22.dahlia',
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is required for checkout.');

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: input.orderId,
        customer_email: input.customerEmail,
        automatic_tax: { enabled: true },
        line_items: input.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: item.configuration.currency.toLowerCase(),
            unit_amount: item.configuration.unitPrice,
            tax_behavior: 'exclusive',
            product_data: {
              name: `${item.designTitle} — ${item.productTitle}`,
              description: item.variantTitle,
              tax_code: 'txcd_99999999',
              metadata: {
                configuration_hash: item.configurationHash,
              },
            },
          },
        })),
        shipping_address_collection: {
          allowed_countries: ['US'],
        },
        phone_number_collection: { enabled: true },
        billing_address_collection: 'auto',
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancel?order_id=${encodeURIComponent(input.orderId)}`,
        metadata: {
          order_id: input.orderId,
          checkout_id: input.checkoutId,
        },
        payment_intent_data: {
          metadata: {
            order_id: input.orderId,
            checkout_id: input.checkoutId,
          },
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (!session.url) {
      throw new Error('Stripe Checkout did not return a redirect URL.');
    }
    return { id: session.id, url: session.url };
  }
}
