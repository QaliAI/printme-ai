import Stripe from 'stripe';
import { describe, expect, it, vi } from 'vitest';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { curatedDesigns } from '@/lib/commerce/fixtures';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import {
  cartConfigurationSnapshotPayloadSchema,
  finalizeConfigurationSnapshot,
} from '@/lib/commerce/snapshot';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import {
  SecureCheckoutService,
  type CheckoutAttempt,
  type CheckoutGateway,
  type CheckoutIdentity,
  type CheckoutStore,
} from '@/lib/commerce/checkout/service';
import {
  StripeCheckoutWebhookService,
  verifyStripeWebhookPayload,
  type StripeWebhookStore,
} from '@/lib/commerce/checkout/stripe-webhook';
import type { CartConfigurationSnapshot } from '@/lib/commerce/types';

function snapshot() {
  const design = curatedDesigns[0];
  const product = getApprovedMerchProducts()[1];
  return createCartSnapshot({
    id: '3cb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
    design,
    product,
    configuration: createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    }),
    createdAt: '2026-07-29T12:00:00.000Z',
  });
}

class MemoryCheckoutStore implements CheckoutStore {
  cartItems: CartConfigurationSnapshot[] = [snapshot()];
  attempt: CheckoutAttempt | null = null;
  createdItems: CartConfigurationSnapshot[] = [];
  identity: CheckoutIdentity | null = null;
  createCount = 0;

  async loadActiveCart(identity: CheckoutIdentity) {
    this.identity = identity;
    return this.cartItems.length
      ? { id: '4cb5afe4-ff4d-4a98-8069-2d5fd1142f4a', items: this.cartItems }
      : null;
  }

  async findAttempt() {
    return this.attempt;
  }

  async loadPendingOrderItems() {
    return structuredClone(this.createdItems);
  }

  async createPendingOrder(
    input: Parameters<CheckoutStore['createPendingOrder']>[0],
  ) {
    this.createCount += 1;
    this.identity = input.identity;
    this.createdItems = structuredClone(input.cart.items);
    this.attempt = {
      orderId: '5cb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
      checkoutId: '6cb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
      stripeSessionId: null,
      redirectUrl: null,
      status: 'pending',
    };
    return this.attempt;
  }

  async attachStripeSession(
    input: Parameters<CheckoutStore['attachStripeSession']>[0],
  ) {
    this.attempt = {
      orderId: input.orderId,
      checkoutId: input.checkoutId,
      stripeSessionId: input.stripeSessionId,
      redirectUrl: input.redirectUrl,
      status: 'redirect_ready',
    };
  }
}

function gateway() {
  return {
    createSession: vi.fn(async () => ({
      id: 'cs_test_fixture',
      url: 'https://checkout.stripe.com/c/pay/cs_test_fixture',
    })),
  } satisfies CheckoutGateway;
}

const identity = {
  guestTokenHash: 'guest-token-hash',
  userEmail: 'guest@example.com',
};

describe('secure Stripe test checkout', () => {
  it('enforces Stripe key mode rules correctly', async () => {
    const { getStripeSecretKey } = await import('@/lib/commerce/checkout/stripe-gateway');
    
    // Test mode requires sk_test_
    process.env.STRIPE_MODE = 'test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
    expect(getStripeSecretKey()).toBe('sk_test_valid_key');

    process.env.STRIPE_SECRET_KEY = 'sk_live_invalid_for_test_mode';
    expect(() => getStripeSecretKey()).toThrow(/STRIPE_MODE is test/);

    // Live mode rejects live keys in development/preview
    process.env.STRIPE_MODE = 'live';
    process.env.STRIPE_SECRET_KEY = 'sk_live_valid_key';
    process.env.NODE_ENV = 'development';
    expect(() => getStripeSecretKey()).toThrow(/Live Stripe keys are prohibited/);

    // Reset env vars to safe test defaults
    process.env.STRIPE_MODE = 'test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_local_e2e_only';
    process.env.NODE_ENV = 'test';
  });
  it('rejects client price tampering even with a recomputed hash', async () => {
    const store = new MemoryCheckoutStore();
    const original = snapshot();
    const payload = cartConfigurationSnapshotPayloadSchema.parse(original);
    store.cartItems = [
      finalizeConfigurationSnapshot({
        ...payload,
        configuration: {
          ...payload.configuration,
          unitPrice: 1,
        },
      }),
    ];

    await expect(
      new SecureCheckoutService(store, gateway()).create(identity, {
        idempotencyKey: '7cb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
      }),
    ).rejects.toMatchObject({ code: 'PRICE_MISMATCH' });
  });

  it('rejects stale variants and invalid carts', async () => {
    const staleStore = new MemoryCheckoutStore();
    await expect(
      new SecureCheckoutService(staleStore, gateway(), {
        isVariantAvailable: async () => false,
      }).create(identity, {
        idempotencyKey: '8cb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
      }),
    ).rejects.toMatchObject({ code: 'VARIANT_STALE' });

    const emptyStore = new MemoryCheckoutStore();
    emptyStore.cartItems = [];
    await expect(
      new SecureCheckoutService(emptyStore, gateway()).create(identity, {
        idempotencyKey: '9cb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
      }),
    ).rejects.toMatchObject({ code: 'CART_EMPTY' });
  });

  it('supports guest checkout and copies immutable order snapshots', async () => {
    const store = new MemoryCheckoutStore();
    const service = new SecureCheckoutService(store, gateway());
    const result = await service.create(identity, {
      idempotencyKey: 'acb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
    });

    expect(result.status).toBe('redirect_ready');
    expect(store.identity?.userId).toBeUndefined();
    expect(store.identity?.guestTokenHash).toBe(identity.guestTokenHash);
    store.cartItems[0].configuration.selectedSize = 'L';
    expect(store.createdItems[0].configuration.selectedSize).toBe('M');
  });

  it('returns an existing redirect without creating a duplicate order', async () => {
    const store = new MemoryCheckoutStore();
    store.attempt = {
      orderId: 'bcb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
      checkoutId: 'ccb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
      stripeSessionId: 'cs_test_existing',
      redirectUrl: 'https://checkout.stripe.com/c/pay/cs_test_existing',
      status: 'redirect_ready',
    };
    const stripe = gateway();
    const result = await new SecureCheckoutService(store, stripe).create(
      identity,
      {
        idempotencyKey: 'dcb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
      },
    );

    expect(result).toEqual(store.attempt);
    expect(store.createCount).toBe(0);
    expect(stripe.createSession).not.toHaveBeenCalled();
  });
});

class MemoryWebhookStore implements StripeWebhookStore {
  events = new Set<string>();
  failedEvents = new Map<string, Stripe.Event>();
  completed: Parameters<StripeWebhookStore['completePayment']>[0] | null =
    null;
  failedCode: string | null = null;

  async beginEvent(event: Stripe.Event) {
    if (this.events.has(event.id)) return false;
    this.events.add(event.id);
    return true;
  }

  async claimFailedEvent(eventId: string) {
    const event = this.failedEvents.get(eventId) ?? null;
    this.failedEvents.delete(eventId);
    return event;
  }

  async completeEvent() {}

  async failEvent(_eventId: string, code: string) {
    this.failedCode = code;
  }

  async completePayment(
    input: Parameters<StripeWebhookStore['completePayment']>[0],
  ) {
    if (input.paidAmount !== 3400 || input.currency !== 'USD') {
      throw new Error('amount mismatch');
    }
    this.completed = input;
    return 'ecb5afe4-ff4d-4a98-8069-2d5fd1142f4a';
  }
}

function paidEvent(eventId = 'evt_test_paid'): Stripe.Event {
  return {
    id: eventId,
    object: 'event',
    api_version: '2026-04-22.dahlia',
    created: 1,
    data: {
      object: {
        id: 'cs_test_fixture',
        object: 'checkout.session',
        payment_status: 'paid',
        amount_total: 3400,
        currency: 'usd',
        payment_intent: 'pi_test_fixture',
        customer_details: {
          email: 'guest@example.com',
          name: 'Guest Shopper',
          phone: null,
          tax_exempt: 'none',
          tax_ids: [],
          address: null,
          business_name: null,
          individual_name: null,
        },
        collected_information: {
          shipping_details: {
            name: 'Guest Shopper',
            address: {
              line1: '1 Test Way',
              line2: null,
              city: 'Chicago',
              state: 'IL',
              postal_code: '60601',
              country: 'US',
            },
          },
        },
      } as unknown as Stripe.Checkout.Session,
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: 'checkout.session.completed',
  };
}

describe('Stripe webhook authority', () => {
  it('verifies signatures against the exact raw body', () => {
    const payload = JSON.stringify(paidEvent());
    const secret = 'whsec_test_fixture_secret';
    const stripe = new Stripe('sk_test_signature_fixture');
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });

    expect(
      verifyStripeWebhookPayload(payload, signature, secret).id,
    ).toBe('evt_test_paid');
    expect(() =>
      verifyStripeWebhookPayload(`${payload} `, signature, secret),
    ).toThrow();
  });

  it('marks paid only after verified event processing and deduplicates events', async () => {
    const store = new MemoryWebhookStore();
    const service = new StripeCheckoutWebhookService(store);

    const first = await service.process(paidEvent());
    const duplicate = await service.process(paidEvent());

    expect(first.orderId).toBe(
      'ecb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
    );
    expect(store.completed?.paymentIntentId).toBe('pi_test_fixture');
    expect(duplicate.duplicate).toBe(true);
  });

  it('rejects incomplete shipping and amount mismatches', async () => {
    const incompleteStore = new MemoryWebhookStore();
    const incomplete = paidEvent('evt_test_incomplete');
    (incomplete.data.object as Stripe.Checkout.Session).collected_information =
      null;
    await expect(
      new StripeCheckoutWebhookService(incompleteStore).process(incomplete),
    ).rejects.toMatchObject({ code: 'INCOMPLETE_SHIPPING_ADDRESS' });
    expect(incompleteStore.failedCode).toBe('INCOMPLETE_SHIPPING_ADDRESS');

    const amountStore = new MemoryWebhookStore();
    const wrongAmount = paidEvent('evt_test_amount');
    (wrongAmount.data.object as Stripe.Checkout.Session).amount_total = 1;
    await expect(
      new StripeCheckoutWebhookService(amountStore).process(wrongAmount),
    ).rejects.toThrow(/amount mismatch/i);
    expect(amountStore.failedCode).toBe('WEBHOOK_PROCESSING_FAILED');
  });

  it('claims each failed Stripe event for replay only once', async () => {
    const store = new MemoryWebhookStore();
    const event = paidEvent('evt_test_replay');
    store.failedEvents.set(event.id, event);
    const service = new StripeCheckoutWebhookService(store);

    const replayed = await service.replay(event.id);
    const duplicateReplay = await service.replay(event.id);

    expect(replayed.orderId).toBe(
      'ecb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
    );
    expect(duplicateReplay.duplicate).toBe(true);
  });
});
