import 'server-only';

import { randomUUID, timingSafeEqual } from 'node:crypto';
import type Stripe from 'stripe';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  SecureCheckoutService,
  type CheckoutAttempt,
  type CheckoutStore,
} from '../checkout/service';
import type { StripeWebhookStore } from '../checkout/stripe-webhook';
import { checkPaidOrderTotals } from '../checkout/payment-totals';
import type { CheckoutConfirmation } from '../checkout/confirmation';
import type { FulfillmentOrder } from '../fulfillment/payload';
import type {
  FulfillmentJob,
  FulfillmentStore,
} from '../fulfillment/service';
import { cartConfigurationSnapshotSchema } from '../snapshot';
import type { CartConfigurationSnapshot } from '../types';

interface HarnessOrder {
  id: string;
  items: CartConfigurationSnapshot[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paidAmount: number | null;
  currency: string;
  paymentStatus: 'unpaid' | 'paid';
  paymentIntentId: string | null;
  customerEmail: string | null;
  shippingAddress: FulfillmentOrder['shippingAddress'] | null;
  stripeSessionId: string | null;
  fulfillmentJob: FulfillmentJob | null;
  dryRunCount: number;
  printifyWriteCount: number;
}

interface HarnessAttempt extends CheckoutAttempt {
  sessionKey: string;
  idempotencyKey: string;
}

interface HarnessEvent {
  event: Stripe.Event;
  status: 'processing' | 'processed' | 'failed';
  attempts: number;
  orderId: string | null;
}

interface HarnessState {
  carts: Map<string, CartConfigurationSnapshot[]>;
  attempts: Map<string, HarnessAttempt>;
  orders: Map<string, HarnessOrder>;
  events: Map<string, HarnessEvent>;
}

const harnessGlobal = globalThis as typeof globalThis & {
  __printmeCommerceE2EState?: HarnessState;
};

function state(): HarnessState {
  harnessGlobal.__printmeCommerceE2EState ??= {
    carts: new Map(),
    attempts: new Map(),
    orders: new Map(),
    events: new Map(),
  };
  return harnessGlobal.__printmeCommerceE2EState;
}

function safeEqual(expected: string, supplied: string) {
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

export function isCommerceE2ERequest(request: NextRequest) {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.COMMERCE_E2E_TEST_MODE !== 'true'
  ) {
    return false;
  }
  const expected = process.env.COMMERCE_E2E_TEST_SECRET;
  const supplied =
    request.headers.get('x-commerce-e2e-secret') ??
    request.cookies.get('printme-e2e-secret')?.value;
  return Boolean(expected && supplied && safeEqual(expected, supplied));
}

export function getCommerceE2ESession(request: NextRequest) {
  const value =
    request.headers.get('x-commerce-e2e-session') ??
    request.cookies.get('printme-e2e-session')?.value;
  return z.string().uuid().parse(value);
}

export function getE2ECart(sessionKey: string) {
  return structuredClone(state().carts.get(sessionKey) ?? []);
}

export function upsertE2ECartItem(
  sessionKey: string,
  value: unknown,
) {
  const snapshot = cartConfigurationSnapshotSchema.parse(value);
  const items = state().carts.get(sessionKey) ?? [];
  const index = items.findIndex((item) => item.id === snapshot.id);
  const next = structuredClone(items);
  if (index >= 0) next[index] = structuredClone(snapshot);
  else next.push(structuredClone(snapshot));
  state().carts.set(sessionKey, next);
  return structuredClone(snapshot);
}

export function removeE2ECartItem(
  sessionKey: string,
  itemId: string,
) {
  const items = state().carts.get(sessionKey) ?? [];
  state().carts.set(
    sessionKey,
    items.filter((item) => item.id !== itemId),
  );
}

class E2ECheckoutStore implements CheckoutStore {
  constructor(private readonly sessionKey: string) {}

  async loadActiveCart() {
    const items = getE2ECart(this.sessionKey);
    return items.length
      ? { id: this.sessionKey, items }
      : null;
  }

  async findAttempt(
    _identity: Parameters<CheckoutStore['findAttempt']>[0],
    idempotencyKey: string,
  ) {
    return (
      [...state().attempts.values()].find(
        (attempt) =>
          attempt.sessionKey === this.sessionKey &&
          attempt.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async loadPendingOrderItems(orderId: string) {
    return structuredClone(state().orders.get(orderId)?.items ?? []);
  }

  async createPendingOrder(
    input: Parameters<CheckoutStore['createPendingOrder']>[0],
  ) {
    const orderId = randomUUID();
    const checkoutId = randomUUID();
    const attempt: HarnessAttempt = {
      orderId,
      checkoutId,
      stripeSessionId: null,
      redirectUrl: null,
      status: 'pending',
      sessionKey: this.sessionKey,
      idempotencyKey: input.idempotencyKey,
    };
    state().orders.set(orderId, {
      id: orderId,
      items: structuredClone(input.cart.items),
      subtotal: input.subtotal,
      shipping: 0,
      tax: 0,
      total: input.subtotal,
      paidAmount: null,
      currency: input.currency,
      paymentStatus: 'unpaid',
      paymentIntentId: null,
      customerEmail: null,
      shippingAddress: null,
      stripeSessionId: null,
      fulfillmentJob: null,
      dryRunCount: 0,
      printifyWriteCount: 0,
    });
    state().attempts.set(checkoutId, attempt);
    return structuredClone(attempt);
  }

  async attachStripeSession(
    input: Parameters<CheckoutStore['attachStripeSession']>[0],
  ) {
    const attempt = state().attempts.get(input.checkoutId);
    const order = state().orders.get(input.orderId);
    if (!attempt || !order) throw new Error('E2E checkout state missing.');
    Object.assign(attempt, {
      stripeSessionId: input.stripeSessionId,
      redirectUrl: input.redirectUrl,
      status: 'redirect_ready',
    });
    order.stripeSessionId = input.stripeSessionId;
    order.shipping = input.shippingCents;
    order.tax = 0;
    order.total = order.subtotal + input.shippingCents;
  }
}

export async function createE2ECheckout(
  sessionKey: string,
  input: unknown,
) {
  const service = new SecureCheckoutService(
    new E2ECheckoutStore(sessionKey),
    {
      async createSession() {
        const sessionId = `cs_test_e2e_${randomUUID()}`;
        return {
          id: sessionId,
          url: `https://checkout.stripe.com/c/pay/${sessionId}`,
        };
      },
    },
  );
  return service.create({ guestTokenHash: sessionKey }, input);
}

export class E2EStripeWebhookStore implements StripeWebhookStore {
  async closeCheckout(input: Parameters<StripeWebhookStore['closeCheckout']>[0]) {
    for (const attempt of state().attempts.values()) {
      const order = state().orders.get(attempt.orderId);
      if (attempt.stripeSessionId === input.stripeSessionId && order?.paymentStatus === 'unpaid') {
        attempt.status = input.reason === 'expired' ? 'cancelled' : 'failed';
      }
    }
    await this.completeEvent(input.eventId);
  }
  async recordPaymentHold() { throw new Error('Use the PostgreSQL payment-hold tests.'); }

  async beginEvent(event: Stripe.Event) {
    if (state().events.has(event.id)) return false;
    state().events.set(event.id, {
      event: structuredClone(event),
      status: 'processing',
      attempts: 1,
      orderId: null,
    });
    return true;
  }

  async claimFailedEvent(eventId: string) {
    const stored = state().events.get(eventId);
    if (!stored || stored.status !== 'failed') return null;
    stored.status = 'processing';
    stored.attempts += 1;
    return structuredClone(stored.event);
  }

  async completeEvent(eventId: string) {
    const stored = state().events.get(eventId);
    if (stored) stored.status = 'processed';
  }

  async failEvent(eventId: string) {
    const stored = state().events.get(eventId);
    if (stored) stored.status = 'failed';
  }

  async completePayment(
    input: Parameters<StripeWebhookStore['completePayment']>[0],
  ) {
    const order = [...state().orders.values()].find(
      (candidate) => candidate.stripeSessionId === input.stripeSessionId,
    );
    if (!order) throw new Error('E2E checkout order not found.');
    // Mirrors complete_stripe_checkout_payment (migrations/013).
    if (order.paymentStatus !== 'unpaid') {
      if (order.paymentIntentId !== input.paymentIntentId) {
        throw new Error('E2E order already paid by another payment.');
      }
      const replayed = state().events.get(input.eventId);
      if (replayed) replayed.orderId = order.id;
      await this.completeEvent(input.eventId);
      return order.id;
    }
    const mismatch = checkPaidOrderTotals(order, {
      subtotal: input.amountSubtotal,
      shipping: input.amountShipping,
      tax: input.amountTax,
      discount: input.amountDiscount,
      total: input.paidAmount,
      currency: input.currency,
    });
    if (mismatch) {
      throw new Error(`E2E paid amount mismatch: ${mismatch}.`);
    }
    order.paymentStatus = 'paid';
    order.paymentIntentId = input.paymentIntentId;
    order.tax = input.amountTax;
    order.total = input.paidAmount;
    order.paidAmount = input.paidAmount;
    order.customerEmail = input.customerEmail;
    order.shippingAddress = {
      ...input.shippingAddress,
      phone: '',
    };
    order.fulfillmentJob ??= {
      id: randomUUID(),
      orderId: order.id,
      state: 'paid',
      mode: 'disabled',
      printifyOrderId: null,
      productionSubmittedAt: null,
    };
    const storedEvent = state().events.get(input.eventId);
    if (storedEvent) storedEvent.orderId = order.id;
    await this.completeEvent(input.eventId);
    return order.id;
  }
}

export class E2EFulfillmentStore implements FulfillmentStore {
  async loadPaidOrder(orderId: string) {
    const order = state().orders.get(orderId);
    if (
      !order ||
      order.paymentStatus !== 'paid' ||
      !order.customerEmail ||
      !order.shippingAddress
    ) {
      return null;
    }
    return {
      id: order.id,
      paymentStatus: 'paid' as const,
      customerEmail: order.customerEmail,
      shippingAddress: structuredClone(order.shippingAddress),
      items: structuredClone(order.items),
      printifyOrderId: null,
      productionSubmittedAt: null,
    };
  }

  async findJob(orderId: string) {
    return structuredClone(
      state().orders.get(orderId)?.fulfillmentJob ?? null,
    );
  }

  async lockJob(
    input: Parameters<FulfillmentStore['lockJob']>[0],
  ) {
    const order = state().orders.get(input.orderId);
    const job = order?.fulfillmentJob;
    if (!order || !job) throw new Error('E2E fulfillment job missing.');
    const alreadyComplete = job.state === 'dry_run_complete';
    if (!alreadyComplete) {
      job.state = 'preparing_fulfillment';
      job.mode = input.mode;
    }
    return { job: structuredClone(job), alreadyComplete };
  }

  async completeDryRun(
    input: Parameters<FulfillmentStore['completeDryRun']>[0],
  ) {
    const order = state().orders.get(input.orderId);
    if (!order?.fulfillmentJob) {
      throw new Error('E2E fulfillment job missing.');
    }
    order.fulfillmentJob.state = 'dry_run_complete';
    order.fulfillmentJob.mode = 'dry-run';
    order.dryRunCount += 1;
  }

  async markReady(
    input: Parameters<FulfillmentStore['markReady']>[0],
  ) {
    const job = state().orders.get(input.orderId)?.fulfillmentJob;
    if (job) job.state = input.state ?? 'fulfillment_ready';
  }

  async markFailed(
    input: Parameters<FulfillmentStore['markFailed']>[0],
  ) {
    const job = state().orders.get(input.orderId)?.fulfillmentJob;
    if (job) job.state = 'fulfillment_failed';
  }

  async markSubmitting() {
    throw new Error('Printify writes are unavailable in the E2E harness.');
  }

  async markSubmitted() {
    throw new Error('Printify writes are unavailable in the E2E harness.');
  }
}

export function getE2EConfirmation(
  stripeSessionId: string,
): CheckoutConfirmation | null {
  const order = [...state().orders.values()].find(
    (candidate) => candidate.stripeSessionId === stripeSessionId,
  );
  if (!order) return null;
  return {
    orderId: order.id,
    paymentStatus: order.paymentStatus,
    verified: order.paymentStatus === 'paid',
  };
}

export function getE2EStatus(
  sessionKey: string,
  stripeSessionId?: string,
) {
  const order = stripeSessionId
    ? [...state().orders.values()].find(
        (candidate) => candidate.stripeSessionId === stripeSessionId,
      )
    : undefined;
  const eventAttempts = [...state().events.values()].reduce(
    (total, event) =>
      total + (event.orderId === order?.id ? event.attempts : 0),
    0,
  );
  return {
    cartItemCount: state().carts.get(sessionKey)?.length ?? 0,
    paymentStatus: order?.paymentStatus ?? null,
    fulfillmentState: order?.fulfillmentJob?.state ?? null,
    dryRunCount: order?.dryRunCount ?? 0,
    printifyWriteCount: order?.printifyWriteCount ?? 0,
    eventAttempts,
    amounts: order
      ? {
          subtotal: order.subtotal,
          shipping: order.shipping,
          tax: order.tax,
          total: order.total,
          paidAmount: order.paidAmount,
        }
      : null,
  };
}
