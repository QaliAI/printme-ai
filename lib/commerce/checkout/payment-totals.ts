/**
 * Paid-amount rules shared by the Stripe webhook, the e2e harness and the
 * `complete_stripe_checkout_payment` RPC (migrations/013 and the canonical
 * launch migration). Keep the three in step.
 *
 * All amounts are integer cents. `orders.subtotal`, `orders.shipping`,
 * `orders.tax`, `orders.total` and `orders.paid_amount` hold cents too.
 *
 * The pending order stores the item subtotal and the shipping fee that was
 * put on the Stripe session. Tax is only known once Stripe computes it, so it
 * is taken from the completed session. A payment is accepted only when
 *   - Stripe's own numbers add up: total = subtotal + shipping + tax - discount,
 *   - the subtotal and shipping equal what the order recorded,
 *   - there is no discount (checkout offers none), and
 *   - tax is not larger than subtotal + shipping.
 */

export interface StripeSessionAmountsInput {
  amount_total: number | null;
  amount_subtotal: number | null;
  total_details?: {
    amount_shipping?: number | null;
    amount_tax?: number | null;
    amount_discount?: number | null;
  } | null;
}

export interface PaidAmounts {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

export type PaymentTotalsErrorCode =
  | 'INCOMPLETE_PAYMENT_DETAILS'
  | 'PAYMENT_TOTALS_INCONSISTENT'
  | 'UNEXPECTED_DISCOUNT';

export type OrderTotalsMismatchCode =
  | 'CURRENCY_MISMATCH'
  | 'SUBTOTAL_MISMATCH'
  | 'SHIPPING_MISMATCH'
  | 'UNEXPECTED_DISCOUNT'
  | 'TAX_OUT_OF_RANGE'
  | 'TOTAL_MISMATCH';

export class PaymentTotalsError extends Error {
  constructor(readonly code: PaymentTotalsErrorCode) {
    super(`Stripe payment totals rejected: ${code}.`);
    this.name = 'PaymentTotalsError';
  }
}

function cents(value: number | null | undefined) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

/** Reads and cross-checks the amounts on a completed Checkout Session. */
export function readStripeSessionAmounts(
  session: StripeSessionAmountsInput,
): PaidAmounts {
  const total = cents(session.amount_total);
  const subtotal = cents(session.amount_subtotal);
  const shipping = cents(session.total_details?.amount_shipping);
  const tax = cents(session.total_details?.amount_tax);
  const discount = cents(session.total_details?.amount_discount);
  if (
    total === null ||
    subtotal === null ||
    shipping === null ||
    tax === null ||
    discount === null
  ) {
    throw new PaymentTotalsError('INCOMPLETE_PAYMENT_DETAILS');
  }
  if (total !== subtotal + shipping + tax - discount) {
    throw new PaymentTotalsError('PAYMENT_TOTALS_INCONSISTENT');
  }
  if (discount !== 0) {
    throw new PaymentTotalsError('UNEXPECTED_DISCOUNT');
  }
  return { subtotal, shipping, tax, discount, total };
}

/** Same checks as complete_stripe_checkout_payment. Returns null when the payment matches. */
export function checkPaidOrderTotals(
  order: { subtotal: number; shipping: number; currency: string },
  paid: PaidAmounts & { currency: string },
): OrderTotalsMismatchCode | null {
  if (order.currency.toUpperCase() !== paid.currency.toUpperCase()) {
    return 'CURRENCY_MISMATCH';
  }
  if (paid.subtotal !== order.subtotal) return 'SUBTOTAL_MISMATCH';
  if (paid.shipping !== order.shipping) return 'SHIPPING_MISMATCH';
  if (paid.discount !== 0) return 'UNEXPECTED_DISCOUNT';
  if (paid.tax > paid.subtotal + paid.shipping) return 'TAX_OUT_OF_RANGE';
  if (paid.total !== paid.subtotal + paid.shipping + paid.tax - paid.discount) {
    return 'TOTAL_MISMATCH';
  }
  return null;
}

/** `orders.shipping` is stored in cents, like the other order amounts. */
export function orderShippingPaidCents(value: number | string | null | undefined) {
  const parsed = Math.round(Number(value ?? 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
