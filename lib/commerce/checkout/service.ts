import 'server-only';

import { z } from 'zod';
import type { CartConfigurationSnapshot } from '../types';
import { validateSnapshotAgainstApprovedCatalog } from '../catalog/validation';
import type { CatalogAvailability } from '../catalog/validation';

export const checkoutRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
});

export interface CheckoutIdentity {
  guestTokenHash: string;
  userId?: string;
  userEmail?: string;
}

export interface CheckoutCart {
  id: string;
  items: CartConfigurationSnapshot[];
}

export interface CheckoutAttempt {
  orderId: string;
  checkoutId: string;
  stripeSessionId: string | null;
  redirectUrl: string | null;
  status: string;
}

export interface CheckoutStore {
  loadActiveCart(identity: CheckoutIdentity): Promise<CheckoutCart | null>;
  findAttempt(
    identity: CheckoutIdentity,
    idempotencyKey: string,
  ): Promise<CheckoutAttempt | null>;
  loadPendingOrderItems(
    orderId: string,
  ): Promise<CartConfigurationSnapshot[]>;
  createPendingOrder(input: {
    identity: CheckoutIdentity;
    cart: CheckoutCart;
    idempotencyKey: string;
    subtotal: number;
    currency: 'USD';
  }): Promise<CheckoutAttempt>;
  attachStripeSession(input: {
    orderId: string;
    checkoutId: string;
    stripeSessionId: string;
    redirectUrl: string;
  }): Promise<void>;
}

export interface CheckoutGateway {
  createSession(input: {
    orderId: string;
    checkoutId: string;
    idempotencyKey: string;
    customerEmail?: string;
    items: CartConfigurationSnapshot[];
  }): Promise<{ id: string; url: string }>;
}

export class CheckoutValidationError extends Error {
  constructor(readonly code: string) {
    super(`Checkout validation failed: ${code}.`);
    this.name = 'CheckoutValidationError';
  }
}

export class SecureCheckoutService {
  constructor(
    private readonly store: CheckoutStore,
    private readonly gateway: CheckoutGateway,
    private readonly availability?: CatalogAvailability,
  ) {}

  async create(
    identity: CheckoutIdentity,
    input: unknown,
  ): Promise<CheckoutAttempt> {
    const { idempotencyKey } = checkoutRequestSchema.parse(input);
    const existing = await this.store.findAttempt(identity, idempotencyKey);
    if (existing?.redirectUrl && existing.stripeSessionId) return existing;

    let cart: CheckoutCart | null = null;
    let items: CartConfigurationSnapshot[];
    if (existing) {
      items = await this.store.loadPendingOrderItems(existing.orderId);
      if (items.length === 0) {
        throw new CheckoutValidationError('ORDER_ITEMS_MISSING');
      }
    } else {
      cart = await this.store.loadActiveCart(identity);
      if (!cart || cart.items.length === 0) {
        throw new CheckoutValidationError('CART_EMPTY');
      }
      items = cart.items;
    }

    for (const item of items) {
      await validateSnapshotAgainstApprovedCatalog(item, this.availability);
    }

    const currencies = new Set(
      items.map((item) => item.configuration.currency),
    );
    if (currencies.size !== 1 || !currencies.has('USD')) {
      throw new CheckoutValidationError('CURRENCY_MISMATCH');
    }
    const subtotal = items.reduce(
      (total, item) =>
        total + item.configuration.unitPrice * item.quantity,
      0,
    );
    if (!Number.isSafeInteger(subtotal) || subtotal <= 0) {
      throw new CheckoutValidationError('INVALID_TOTAL');
    }

    const attempt =
      existing ??
      (await this.store.createPendingOrder({
        identity,
        cart: cart!,
        idempotencyKey,
        subtotal,
        currency: 'USD',
      }));
    const session = await this.gateway.createSession({
      orderId: attempt.orderId,
      checkoutId: attempt.checkoutId,
      idempotencyKey: `printme-checkout:${attempt.checkoutId}`,
      customerEmail: identity.userEmail,
      items,
    });
    await this.store.attachStripeSession({
      orderId: attempt.orderId,
      checkoutId: attempt.checkoutId,
      stripeSessionId: session.id,
      redirectUrl: session.url,
    });

    return {
      ...attempt,
      stripeSessionId: session.id,
      redirectUrl: session.url,
      status: 'redirect_ready',
    };
  }
}
