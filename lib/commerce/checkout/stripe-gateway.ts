import 'server-only';

import Stripe from 'stripe';
import type {
  CheckoutGateway,
} from './service';

function getStripeTestSecret() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret?.startsWith('sk_test_')) {
    throw new Error('Secure checkout requires a Stripe test-mode secret key.');
  }
  return secret;
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
        line_items: input.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: item.configuration.currency.toLowerCase(),
            unit_amount: item.configuration.unitPrice,
            product_data: {
              name: `${item.designTitle} — ${item.productTitle}`,
              description: item.variantTitle,
              metadata: {
                configuration_hash: item.configurationHash,
              },
            },
          },
        })),
        shipping_address_collection: {
          allowed_countries: ['US', 'CA'],
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
